let covered = true;
const queue = new Set<() => void>();

export function setCovered(value: boolean) {
  covered = value;
  if (value) return;
  queue.forEach((callback) => callback());
  queue.clear();
}

export function isCovered() {
  return covered;
}

export function whenRevealed(callback: () => void) {
  if (!covered) {
    callback();
    return () => {};
  }
  queue.add(callback);
  return () => {
    queue.delete(callback);
  };
}
