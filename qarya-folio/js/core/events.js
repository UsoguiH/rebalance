// Tiny event bus shared by every module (see ARCHITECTURE.md for the list).
export function createEvents() {
  const map = new Map();
  return {
    on(name, fn) {
      if (!map.has(name)) map.set(name, new Set());
      map.get(name).add(fn);
      return () => map.get(name).delete(fn);
    },
    emit(name, data) {
      const set = map.get(name);
      if (set) for (const fn of [...set]) fn(data);
    },
  };
}
