/**
 * A DOM small enough to run in `node:test`.
 *
 * `AGENTS.md` names the suite's blind spot plainly: it has no DOM, so a panel can be
 * wrong in ways nothing notices. It also records that a headless smoke test — a fake
 * `document.createElement` and no library — is cheap and catches what unit tests cannot.
 * This is that.
 *
 * Deliberately minimal and deliberately **not** a DOM emulator. It supports exactly the
 * handful of things `js/utils/dom.js` and the settings panel actually use:
 * `createElement`, `createTextNode`, `append`, `replaceChildren`, `className`,
 * `textContent`, `classList`, `addEventListener`/`dispatchEvent`, `focus`, `setAttribute`
 * and a `querySelector` for `.class` and `#id`.
 *
 * What it buys, concretely: it caught that the settings page's single status node was
 * rendered inside the *progress* card only, so every message the account action said —
 * including "Checking your password." — appeared in the wrong card.
 *
 * Not supported, and a test needing any of it is testing something this cannot see:
 * layout, CSS, `<form>` submission, focus order in reality, and anything asynchronous
 * that depends on real event dispatch semantics.
 */

/**
 * `element.style`, backed by the `style` attribute.
 *
 * Only the parts a test can actually assert on: reading a property, setting one, and
 * `cssText`. Layout is explicitly out of scope for this harness, so a percentage height
 * here is a string and nothing more — but it is the *same string* the real DOM would
 * report, which is what makes "the fill is at 41.2%" a meaningful assertion.
 */
class InlineStyle {
  constructor(node) {
    this.node = node;
  }

  get _pairs() {
    const raw = this.node.getAttribute('style') ?? '';
    return raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const at = part.indexOf(':');
        return [part.slice(0, at).trim(), part.slice(at + 1).trim()];
      });
  }

  _write(pairs) {
    this.node.setAttribute('style', pairs.map(([k, v]) => `${k}: ${v}`).join('; '));
  }

  getPropertyValue(name) {
    const found = this._pairs.find(([key]) => key === name);
    return found ? found[1] : '';
  }

  setProperty(name, value) {
    const pairs = this._pairs.filter(([key]) => key !== name);
    if (value !== '' && value != null) pairs.push([name, String(value)]);
    this._write(pairs);
  }

  get cssText() {
    return this.node.getAttribute('style') ?? '';
  }

  set cssText(value) {
    this.node.setAttribute('style', String(value));
  }
}

// Dash-case to camelCase, so `style.backgroundColor` and `background-color` are the
// same property the way they are in a browser.
function cssProp(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** A `style` object that accepts any property name and round-trips via the attribute. */
function makeStyle(node) {
  const inner = new InlineStyle(node);
  return new Proxy(inner, {
    get(target, prop) {
      if (typeof prop !== 'string') return target[prop];
      if (prop in target) return target[prop];
      return target.getPropertyValue(cssProp(prop));
    },
    set(target, prop, value) {
      if (typeof prop !== 'string') return true;
      if (prop in target) { target[prop] = value; return true; }
      target.setProperty(cssProp(prop), value);
      return true;
    },
  });
}

class ClassList {
  constructor(node) {
    this.node = node;
  }

  get _names() {
    return String(this.node.className ?? '').split(/\s+/).filter(Boolean);
  }

  add(name) {
    if (!this._names.includes(name)) this.node.className = [...this._names, name].join(' ');
  }

  remove(name) {
    this.node.className = this._names.filter((n) => n !== name).join(' ');
  }

  contains(name) {
    return this._names.includes(name);
  }

  toggle(name, on) {
    if (on === undefined) on = !this.contains(name);
    if (on) this.add(name);
    else this.remove(name);
    return on;
  }

  toString() {
    return this._names.join(' ');
  }
}

export class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.className = '';
    this.classList = new ClassList(this);
    this.disabled = false;
    this.hidden = false;
    this.value = '';
    /**
     * A live `style` object, so `el.style.height = '41.2%'` and reading it back both work,
     * round-tripping through the `style` attribute as the browser does.
     *
     * Every real element has one, and the in-place water meter now depends on it:
     * `plotInspector.js` assigns `fill.style.height` each tick rather than rebuilding the
     * node, because a CSS transition only runs when the same element's value changes.
     * Without this it threw `Cannot set properties of undefined` — a harness failure that
     * reads exactly like a game failure, which is the worst kind of both, and the reason
     * it is added here rather than the production code being bent to suit the harness.
     *
     * A `Proxy` rather than a fixed list of properties, so this does not have to be taught
     * each new CSS property the game styles. That is how a harness silently goes stale and
     * throws on the next one.
     */
    this.style = makeStyle(this);
    /** Replaced per node below — see `installDom`. */
    this._text = '';
    this.focusCount = 0;
  }

  /* --- text -----------------------------------------------------------------
   * `textContent` on a real element returns the concatenated text of descendants and
   * *replaces* all children when set. Both matter here: a test asserting
   * "the player can see this sentence" reads it off the subtree, and `setText` in
   * `dom.js` compares before assigning. */

  get textContent() {
    if (this.childNodes.length === 0) return this._text;
    return this.childNodes.map((c) => c.textContent).join('');
  }

  set textContent(value) {
    this.childNodes = [];
    this._text = String(value);
  }

  /**
   * Mirrors the real `ParentNode.append`, which takes `(Node or DOMString)`.
   *
   * **It used to skip `null` instead, and that was a lie with consequences.** Being laxer
   * than the browser meant `root.append(a ? b : null)` rendered nothing here and the word
   * "null" in a real browser — which is how a guest saw it on the settings page (ISS-052).
   * `el()` has its own null filter and still does, so every `el()` call site is unaffected;
   * what changed is that a bare `append` now fails here the way it fails there.
   */
  append(...children) {
    for (const child of children) {
      const node = child instanceof FakeNode ? child : new FakeTextNode(String(child));
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }

  /**
   * Replace every child.
   *
   * The old children are **detached** first, exactly as the real `ParentNode` does. It
   * used to drop `childNodes` and leave `parentNode` pointing at this element, which made
   * `contains()` walk a tree that no longer existed and answer `true` for nodes that had
   * been removed. `farmView.js` checks that its own card is still in the root before
   * reusing it, and that check silently passed against a detached tree until this was
   * fixed — a harness that lies about the DOM makes every assertion on it worthless.
   */
  replaceChildren(...children) {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes = [];
    this.append(...children);
  }

  /**
   * Detach from the parent, as `Element.remove()` does.
   *
   * Two call sites need it and neither was caught until a boot smoke test ran the real
   * entry script: `loadingTips.js` takes the boot veil down with `veil.remove()`, and
   * `farmActions.js` closes the seed picker the same way. Both are ordinary DOM calls
   * that every browser supports, so a stub without them fails as a *game* bug.
   */
  remove() {
    if (!this.parentNode) return;
    const siblings = this.parentNode.childNodes;
    const at = siblings.indexOf(this);
    if (at !== -1) siblings.splice(at, 1);
    this.parentNode = null;
  }

  /**
   * Swap this node for another, in place.
   *
   * `farmView.js` uses this so a repaint that changes one plot replaces one tile without
   * disturbing the paint order — the plots are absolutely positioned siblings and their
   * **append order is the z-order** (see `plotLayers.js`). `remove()` followed by
   * `append()` would move the tile to the end and silently restack the field, which is
   * exactly the kind of wrong-but-not-throwing defect this harness exists to catch.
   */
  replaceWith(...nodes) {
    if (!this.parentNode) return;
    const siblings = this.parentNode.childNodes;
    const at = siblings.indexOf(this);
    if (at === -1) return;

    for (const node of nodes) node.parentNode = this.parentNode;
    siblings.splice(at, 1, ...nodes);
    this.parentNode = null;
  }

  /* --- attributes ---------------------------------------------------------- */

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    // The panel sets `hidden` and `aria-*` as attributes and reads `hidden` as a
    // property. Keeping them in step is the whole reason this exists.
    if (name === 'hidden') this.hidden = true;
    if (name === 'id') this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'hidden') this.hidden = false;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  /* --- events -------------------------------------------------------------- */

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    const list = this.listeners.get(type) ?? [];
    const at = list.indexOf(handler);
    if (at >= 0) list.splice(at, 1);
  }

  /**
   * Fire every listener for `type`, awaiting any that return a promise.
   *
   * The awaiting is the point: the panel's handlers are `async`, and a click that
   * resolves a microtask later is what makes the "Checking your password." window
   * observable. A non-awaiting `dispatchEvent` would let a test assert only on the
   * final state and miss everything in between.
   *
   * **The event object is now a real one, not `{type, target}`.** It used to be a bare pair,
   * which meant any handler calling `event.preventDefault()` threw *in the test only* - the
   * single most misleading kind of harness failure, because the code under test is correct and
   * the suite is the thing that is wrong. The location bar's suggestion list needs both halves
   * of the combobox keyboard contract: `preventDefault` to swallow Enter so the form does not
   * also submit, and `key` to tell ArrowDown from ArrowUp. Neither is expressible without this.
   *
   * @param {string} type
   * @param {{key?: string}} [init] extra event fields, merged onto the object
   * @returns {Promise<object>} the event, so a test can read `defaultPrevented`
   */
  async dispatch(type, init = {}) {
    const event = {
      type,
      target: this,
      key: init.key ?? '',
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {},
    };

    for (const handler of [...(this.listeners.get(type) ?? [])]) {
      await handler(event);
    }

    return event;
  }

  click() {
    return this.dispatch('click');
  }

  /** Fire `keydown` with `key` set, as a browser does for a real keystroke. */
  key(key) {
    return this.dispatch('keydown', { key });
  }

  /** Change the value, as a player typing does. Does not fire `input` on its own. */
  type(value) {
    this.value = value;
    return this.dispatch('input');
  }

  focus() {
    this.focusCount += 1;
  }

  /** Ancestor test, as `Node.contains()`. Deep, and includes the node itself. */
  contains(other) {
    for (let node = other; node; node = node.parentNode) {
      if (node === this) return true;
    }
    return false;
  }

  /* --- traversal ------------------------------------------------------------ */

  get children() {
    return this.childNodes.filter((n) => n instanceof FakeNode);
  }

  /** Depth-first over every descendant, self excluded. */
  * descendants() {
    for (const child of this.children) {
      yield child;
      yield* child.descendants();
    }
  }

  /** Matches `.a`, `.a.b`, `#id` or `tag`, and nothing more. */
  matches(selector) {
    if (selector.startsWith('.')) {
      return selector.slice(1).split('.').every((name) => this.classList.contains(name));
    }
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    return this.tagName === selector.toUpperCase();
  }

  querySelectorAll(selector) {
    return [...this.descendants()].filter((node) => node.matches(selector));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

class FakeTextNode extends FakeNode {
  constructor(text) {
    super('#text');
    this._text = String(text);
  }

  get textContent() {
    return this._text;
  }

  set textContent(value) {
    this._text = String(value);
  }
}

/**
 * Install `globalThis.document` and `globalThis.Node`, and return a root to mount into.
 *
 * `addEventListener` / `removeEventListener` are no-ops because the real `document` has
 * them and `js/connection.js` calls them on it. Their absence made a boot smoke test
 * fail with `target.addEventListener is not a function` — a harness failure that reads
 * exactly like a game failure, which is the worst kind of both. `hidden` is here for
 * the same reason: `main.js`'s tick reads it to skip repaints on a backgrounded tab,
 * and `undefined` reads as falsy, i.e. always repaint.
 *
 * @returns {FakeNode}
 */
export function installDom() {
  const root = new FakeNode('div');
  root.id = 'root';

  globalThis.Node = FakeNode;
  globalThis.document = {
    body: root,
    hidden: false,
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (text) => new FakeTextNode(text),
    querySelector: (selector) => root.querySelector(selector),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  return root;
}

export function uninstallDom() {
  delete globalThis.document;
  delete globalThis.Node;
}

/**
 * Every visible sentence on the page, in document order.
 *
 * Built from the tree rather than from a list of selectors, so a test can assert on what
 * a player can actually read instead of on the internal structure that produces it.
 *
 * @param {FakeNode} root
 * @returns {string[]}
 */
export function visibleText(root) {
  const out = [];

  for (const node of root.descendants()) {
    if (node.hidden) continue;
    if (node.tagName === '#TEXT') {
      const text = node.textContent.trim();
      if (text) out.push(text);
      continue;
    }
    // A hidden ancestor hides its subtree; `descendants()` does not skip those.
    const text = node.textContent.trim();
    if (text && node.children.length === 0 && node.tagName !== 'BUTTON') out.push(text);
  }

  return out;
}

/** The nearest ancestor (self included) whose class list contains `className`. */
export function closestWith(node, className) {
  let current = node;
  while (current) {
    if (current.classList?.contains(className)) return current;
    current = current.parentNode;
  }
  return null;
}
