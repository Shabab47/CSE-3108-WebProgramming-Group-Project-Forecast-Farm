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

  append(...children) {
    for (const child of children) {
      if (child === null || child === undefined || child === false) continue;
      const node = child instanceof FakeNode ? child : new FakeTextNode(String(child));
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }

  replaceChildren(...children) {
    this.childNodes = [];
    this.append(...children);
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
   * @returns {Promise<void>} resolves once every listener has settled
   */
  async dispatch(type) {
    for (const handler of [...(this.listeners.get(type) ?? [])]) {
      await handler({ type, target: this });
    }
  }

  click() {
    return this.dispatch('click');
  }

  focus() {
    this.focusCount += 1;
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
 * @returns {FakeNode}
 */
export function installDom() {
  const root = new FakeNode('div');
  root.id = 'root';

  globalThis.Node = FakeNode;
  globalThis.document = {
    body: root,
    createElement: (tag) => new FakeNode(tag),
    createTextNode: (text) => new FakeTextNode(text),
    querySelector: (selector) => root.querySelector(selector),
    querySelectorAll: (selector) => root.querySelectorAll(selector),
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
