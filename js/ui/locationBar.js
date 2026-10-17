import { SUGGEST_DEBOUNCE_MS, SUGGEST_MIN_QUERY } from '../config/api.js';
import { el, clear } from '../utils/dom.js';
import { icon } from './icon.js';

/**
 * Place search, one row, sitting on the wooden board, and the list it suggests from.
 *
 * ## The two decisions that shaped this
 *
 * **The device-location control is the pin inside the field** rather than a separate button beside
 * it: it is an action on the search box, not a third control competing with it, and as a standalone
 * button the row wrapped onto two lines (ISS-046).
 *
 * **Suggesting does not replace searching.** Submitting the form still works, and still answers
 * from the service — the list is a shortcut, not a gate. A player on a slow connection who types
 * "Dhaka" and presses Enter must still get Dhaka; making the arrow keys the only way in would have
 * traded one failure for another.
 *
 * ## Why the debounce lives here and not in the service
 *
 * `searchPlaces` is asked for candidates and answers for a whole string. Every keystroke is not a
 * new question — `d`, `dh`, `dha`, `dhak` are four questions about *one* question, and asking all
 * four means four live requests racing to paint the list, with the winner decided by latency rather
 * than by order. So the quiet period and the `AbortSignal` that cancels the superseded request are
 * both decided here, next to the typing that caused them, and the service is handed a single
 * settled string.
 *
 * ## Why `onSuggest` answers places and not `{ok, results}`
 *
 * `js/ui/` may not import `js/services/` — `check-imports` enforces it — so the service's envelope
 * would have to be unwrapped somewhere. `main.js` already does exactly this for every other service
 * it calls, and doing it there too means this file never learns what a failed lookup looks like:
 * it gets an **array** of places for a lookup that worked, and **`null`** for one that did not.
 * Those are different, and the difference is visible — see `openList`.
 *
 * @param {Element} root the mount point
 * @param {{onSearch: Function, onChoose?: Function, onSuggest?: Function, onUseDeviceLocation: Function}} actions
 */
export function mountLocationBar(root, actions) {
  clear(root);

  const { onSearch, onChoose, onSuggest, onUseDeviceLocation } = actions;

  /* --- what the list currently holds --------------------------------------- */

  /** Candidate places, in service order. Index 0 is the best match, not the chosen one. */
  let items = [];

  /** Which row is highlighted, or -1 for none. Never "the first" implicitly. */
  let active = -1;

  /** The pending debounce, so a fast typist produces one request rather than five. */
  let timer = null;

  /** The in-flight request, so the next keystroke can throw it away. */
  let pending = null;

  /**
   * Which question is currently being asked.
   *
   * Incremented on every keystroke and captured by the request that keystroke starts, so an answer
   * that arrives after the player has moved on is recognised as stale and dropped. The `AbortSignal`
   * stops the wasted work; this decides who gets to paint. Both are needed: aborting is best-effort
   * by definition, and a response that was already in the browser cache resolves immediately.
   */
  let generation = 0;

  /* --- markup -------------------------------------------------------------- */

  const input = el('input', {
    class: 'location-bar-input',
    id: 'location-input',
    type: 'search',
    placeholder: 'Search your city or zip code',
    autocomplete: 'off',
    // The input carries `aria-label` rather than a visually-hidden `<label>` because the
    // row is a pill with two icon buttons in it — a hidden label would read as a third
    // unlabelled control.
    'aria-label': 'Search for a place',
    // The combobox pattern: the text field owns the list, and `aria-expanded` /
    // `aria-activedescendant` are how a screen reader is told what is open and
    // highlighted without focus ever leaving the field. Without them the list is
    // a set of unlabelled divs that only a mouse can reach.
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': 'location-suggest',
  });

  const list = el('ul', {
    class: 'location-bar-suggest',
    id: 'location-suggest',
    role: 'listbox',
    'aria-label': 'Place suggestions',
    hidden: true,
    on: {
      // **Cancelling `mousedown` is what makes the list survivable.** `mousedown` is the event
      // that moves focus, and losing focus is what closes the list — so a press on a row would
      // remove that row a fraction of a millisecond before the `click` that chose it arrives.
      // Cancelling the default stops the focus change instead, which is the only fix that also
      // covers touch: a tap *always* produces a compatibility `mousedown`, and cancelling it
      // there is what stops an on-screen keyboard player from having the list vanish under
      // their thumb before the tap lands. The alternative — closing on `blur` after a delay —
      // breaks the moment someone presses a row and holds for a moment before lifting.
      mousedown: (event) => event.preventDefault(),
    },
  });

  const form = el('form', { class: 'location-bar', role: 'search' }, [
    el('button', {
      class: 'location-bar-locate',
      type: 'button',
      title: 'Use my current location',
      'aria-label': 'Use my current location',
      on: {
        click: () => onUseDeviceLocation(),
      },
    }, [icon('map-pin', 'location-bar-locate-icon')]),

    input,

    el('button', {
      class: 'location-bar-go',
      type: 'submit',
      title: 'Search',
      'aria-label': 'Search',
    }, [icon('search', 'location-bar-go-icon')]),
  ]);

  // The wrapper exists only so the list can be positioned against the bar without the bar
  // itself growing a `position` it does not otherwise need — and without the list being
  // measured against some ancestor further up the wooden board.
  const wrap = el('div', { class: 'location-bar-wrap' }, [form, list]);

  root.append(wrap);

  /* --- the list ------------------------------------------------------------ */

  /** Drop the list, its rows, and the highlight. */
  function closeList() {
    items = [];
    active = -1;
    clear(list);
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  /** Highlight `index` and let assistive tech know which row it is. */
  function highlight(index) {
    active = index;

    for (const [i, row] of list.querySelectorAll('.location-bar-suggest-item').entries()) {
      row.classList.toggle('is-active', i === index);
      row.setAttribute('aria-selected', String(i === index));
    }

    if (index >= 0) {
      input.setAttribute('aria-activedescendant', `location-suggest-${index}`);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Paint `places` and open the list.
   *
   * `null` and `[]` are different answers and must not look alike on screen:
   *
   * - `[]`   — the service searched and found nothing. "No places found" is the difference
   *            between a search that worked and a search that has not answered yet, and showing
   *            nothing for both makes a working search look broken.
   * - `null` — the service did not answer: offline, aborted, refused. The list closes and the
   *            field keeps what was typed, because the player can still press Enter and the
   *            search path retries. "No places found" here would be a lie about a service that
   *            was never asked.
   */
  function openList(places) {
    if (places === null) {
      closeList();
      return;
    }

    if (!places.length) {
      clear(list).append(
        el('li', { class: 'location-bar-suggest-empty', role: 'presentation' }, ['No places found']),
      );
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    items = places;
    active = -1;

    clear(list).append(
      ...places.map((place, index) =>
        el('li', {
          class: 'location-bar-suggest-item',
          id: `location-suggest-${index}`,
          role: 'option',
          'aria-selected': 'false',
          on: {
            click: () => choose(index),
          },
        }, [
          el('span', { class: 'location-bar-suggest-name', text: place.name ?? '' }),
          place.context ? el('span', { class: 'location-bar-suggest-context', text: place.context }) : null,
        ]),
      ),
    );

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
  }

  /**
   * Move the highlight by `step`, wrapping.
   *
   * From nothing highlighted, Down takes the first row and Up takes the last — which is what
   * makes "arrow down then Enter" work without a separate keypress to open the list.
   */
  function move(step) {
    if (!items.length) return;
    highlight(active < 0
      ? (step > 0 ? 0 : items.length - 1)
      : (active + step + items.length) % items.length);
  }

  /**
   * Take `index` as the answer, rather than the text in the box.
   *
   * The text is only a question; the row is the answer with coordinates attached. Sending the
   * text on instead would re-ask a question whose answer is already on screen, and would get a
   * *different* row back whenever two candidates share a name.
   */
  function choose(index) {
    const place = items[index];
    commit();
    if (!place) return;
    onChoose?.(place);
  }

  /** The same answer by either route: clear the field and close the list. */
  function commit() {
    closeList();
    input.value = '';
  }

  /* --- asking -------------------------------------------------------------- */

  /** Throw away whatever is in flight. Best effort — `generation` is what decides who paints. */
  function cancelPending() {
    pending?.abort();
    pending = null;
  }

  async function ask(query, asked) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    pending = controller;

    let places = null;
    try {
      places = await onSuggest(query, controller?.signal);
    } catch {
      places = null;
    }

    if (pending === controller) pending = null;

    // Superseded. Not a failure, not worth a toast: the player asked a better question a moment
    // later and this answer is no longer about anything on screen.
    if (asked !== generation) return;

    openList(Array.isArray(places) ? places : null);
  }

  input.addEventListener('input', () => {
    const query = input.value.trim();

    // Bumped before anything else, including the early return below, so a response to the
    // *previous* question can never open a list for a query the player has already changed.
    generation += 1;
    if (timer) clearTimeout(timer);
    cancelPending();

    if (query.length < SUGGEST_MIN_QUERY || typeof onSuggest !== 'function') {
      closeList();
      return;
    }

    const asked = generation;
    // `unref` because in `node:test` a live timer keeps the process alive for a debounce
    // nobody is waiting on. Absent in the browser, where the call is a no-op.
    timer = setTimeout(() => { void ask(query, asked); }, SUGGEST_DEBOUNCE_MS);
    timer?.unref?.();
  });

  input.addEventListener('keydown', (event) => {
    // **Nothing is intercepted while the list is closed.** Arrow keys move the caret in a text
    // field, and a player who has never opened the list would lose that for the privilege of a
    // shortcut they are not using. Escape is in the same position: swallowing it when there was
    // nothing to close would steal it from a dialog further up the page.
    if (list.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); return; }

    // Enter with a row highlighted takes that row. With none highlighted it falls through to the
    // submit handler below, which is the plain "search for what I typed" path — so a player who
    // never opened the list never needs to.
    if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      choose(active);
    }
  });

  // Tabbing away, or clicking somewhere else, takes the list with it — and it keeps what was
  // typed, because closing the list is not a decision about the text.
  //
  // Synchronous, because the only thing that can blur this field is a press somewhere *else*:
  // a press on the list itself is cancelled above and never gets here.
  input.addEventListener('blur', () => closeList());

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const query = input.value.trim();
    if (!query) return;

    if (active >= 0 && items[active]) {
      choose(active);
      return;
    }

    commit();
    onSearch(query);
  });

  return {
    close() {
      if (timer) clearTimeout(timer);
      timer = null;
      cancelPending();
      closeList();
    },

    unmount() {
      this.close();
      clear(root);
    },
  };
}
