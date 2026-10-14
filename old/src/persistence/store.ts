/** Minimal key/value surface so game state can be tested without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function browserStore(): KeyValueStore {
  return {
    getItem(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('Storage read failed', key, error);
        return null;
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('Storage write failed', key, error);
      }
    },
  };
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & {dump(): Record<string, string>} {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    dump: () => Object.fromEntries(data),
  };
}

/** Reads JSON as `unknown`; callers must validate. Corrupt data yields null. */
export function readJson(store: KeyValueStore, key: string): unknown {
  const raw = store.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Save data ignored, not valid JSON:', key, error);
    return null;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  store.setItem(key, JSON.stringify(value));
}
