/**
 * Scoped logger.
 *
 * Every module creates one of this at the top level and uses it instead of
 * console, so every line carries its source: `[auth] no account for that email`.
 *
 * Verbose logging is off by default and switched on with `?debug=1` or by
 * setting `localStorage.forecastFarm.debug = 1`. Warnings and errors always
 * print, because a silent failure is worse than a noisy one.
 */

const DEBUG_KEY = 'forecastFarm.debug';

function readEnvDebug() {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('debug') === '1') {
      return true;
    }
  } catch {
    // No location, or an unparseable query string. Fall through to storage.
  }
  try {
    return globalThis.localStorage?.getItem(DEBUG_KEY) === '1';
  } catch {
    // Storage can throw in private browsing modes. Debug logging is optional.
    return false;
  }
}

let debugEnabled = null;

/** True when verbose logging is on. */
export function isDebug() {
  if (debugEnabled === null) debugEnabled = readEnvDebug();
  return debugEnabled;
}

/** Override the cached flag, so the debug panel can flip it at runtime. */
export function setDebug(enabled) {
  debugEnabled = Boolean(enabled);
}

/**
 * Create a logger for one module.
 * @param {string} scope short module name, e.g. 'auth' or 'weatherApi'
 * @returns {{ info: Function, warn: Function, error: Function, trace: Function }}
 */
export function createLog(scope) {
  const emit = (method, args) => {
    /* c8 ignore next */
    if (typeof console === 'undefined') return;
    // eslint-disable-next-line no-console -- the entire purpose of this module
    console[method](`[${scope}]`, ...args);
  };

  return {
    info: (...args) => emit('log', args),
    warn: (...args) => emit('warn', args),
    error: (...args) => emit('error', args),
    /** Verbose. Only prints when debug logging is on. */
    trace: (...args) => {
      if (isDebug()) emit('log', args);
    },
  };
}