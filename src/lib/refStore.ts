/**
 * Tiny localStorage reference-store factories (plain stores with a change event), used by Billing setup,
 * task views, prior-auth rules, etc. Every read is defensive; every write dispatches the change event.
 */

function notify(eventName: string): void {
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof Event !== "undefined") {
      window.dispatchEvent(new Event(eventName));
    }
  } catch {
    /* ignore */
  }
}

export interface ListStore<T extends { id: string }> {
  key: string;
  event: string;
  get(): T[];
  save(list: T[]): void;
  upsert(item: T): T[];
  remove(id: string): T[];
  find(id: string): T | undefined;
}

export function createListStore<T extends { id: string }>(key: string, event: string): ListStore<T> {
  const get = (): T[] => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      const v = raw ? JSON.parse(raw) : [];
      return Array.isArray(v) ? (v as T[]) : [];
    } catch {
      return [];
    }
  };
  const save = (list: T[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* ignore */
    }
    notify(event);
  };
  return {
    key,
    event,
    get,
    save,
    upsert(item) {
      const list = get();
      const i = list.findIndex((x) => x.id === item.id);
      const next = i >= 0 ? list.map((x, idx) => (idx === i ? item : x)) : [...list, item];
      save(next);
      return next;
    },
    remove(id) {
      const next = get().filter((x) => x.id !== id);
      save(next);
      return next;
    },
    find: (id) => get().find((x) => x.id === id),
  };
}

export interface ObjectStore<T extends object> {
  key: string;
  event: string;
  get(): T;
  save(value: T): void;
  patch(partial: Partial<T>): T;
}

export function createObjectStore<T extends object>(key: string, event: string, defaults: T): ObjectStore<T> {
  const get = (): T => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      const v = raw ? JSON.parse(raw) : null;
      return v && typeof v === "object" && !Array.isArray(v) ? { ...defaults, ...v } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  };
  const save = (value: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
    notify(event);
  };
  return {
    key,
    event,
    get,
    save,
    patch(partial) {
      const next = { ...get(), ...partial };
      save(next);
      return next;
    },
  };
}

/** Insert `seed` rows whose id is not present yet. Never overwrites or removes existing rows. Returns count added. */
export function seedMissing<T extends { id: string }>(store: ListStore<T>, seed: T[]): number {
  const have = new Set(store.get().map((x) => x.id));
  const fresh = seed.filter((x) => !have.has(x.id));
  if (fresh.length) store.save([...store.get(), ...fresh]);
  return fresh.length;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
