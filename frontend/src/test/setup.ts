import '@testing-library/jest-dom/vitest'

// JSDOM doesn't implement ResizeObserver, which Recharts' ResponsiveContainer
// requires to detect its container size.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
