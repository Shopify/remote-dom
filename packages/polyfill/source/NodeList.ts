// Performance note (2026-09-02): Benchmarks on an Apple M4 Pro with Node.js
// 24.19.0 (V8 13.6.233.17-node.51) and Chromium 152 showed indexed access and
// `for...of` iteration at parity with Array. Construction, `push()`, and some
// inherited methods (`forEach()`, `includes()`, `map()`, `filter()`, and
// `slice()`) were slower, but the measured end-to-end `querySelectorAll()`
// overhead was 0–12% (up to about 1 µs in the tested 100–1,000-element trees)
// and decreased as selector traversal dominated. Keep this direct subclass
// while indexed access and iteration remain the primary usage patterns.
export class NodeList<T = any> extends Array<T> {
  item(index: number) {
    return this[index] ?? null;
  }
}
