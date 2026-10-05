/**
 * DOM helpers.
 *
 * The one file outside `js/ui/` allowed to touch `document` -- see ISS-010 and
 * the layering table in docs/architecture.md.
 */

/** querySelector, scoped to `root`. Throws if the element is missing. */
export function qs(selector, root = document) {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`qs: no element matches "${selector}"`);
  return el;
}

/** querySelector, or null. */
export function qsOrNull(selector, root = document) {
  return root.querySelector(selector);
}

/** querySelectorAll as a real array. */
export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Create an element.
 * @param {string} tag
 * @param {object} [props] attributes; `class`, `text`, `html`, `dataset` and
 *   `on` (an object of event name to handler) are treated specially.
 * @param {Array<Node|string>} [children]
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;

    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'on') {
      for (const [event, handler] of Object.entries(value)) {
        node.addEventListener(event, handler);
      }
    } else if (key in node && key !== 'list' && typeof value !== 'string') {
      node[key] = value;
    } else {
      node.setAttribute(key, value === true ? '' : value);
    }
  }

  for (const child of [].concat(children)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

/** Remove every child of a node. */
export function clear(node) {
  node.replaceChildren();
  return node;
}

/** Set text only if it actually changed, to avoid needless layout work. */
export function setText(node, value) {
  const next = String(value);
  if (node.textContent !== next) node.textContent = next;
}

/** Toggle a class without needing `classList.toggle(name, bool)`. */
export function setClass(node, name, on) {
  node.classList.toggle(name, Boolean(on));
}

/** Add a listener and get back an unsubscribe function. */
export function listen(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}