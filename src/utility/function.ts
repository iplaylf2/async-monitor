export function expression<T>(f: () => T): T {
  return f();
}
