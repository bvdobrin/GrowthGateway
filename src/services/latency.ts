const IS_TEST = import.meta.env.MODE === 'test';

/** Simulated network latency for the mock backend. */
export const delay = (min = 120, spread = 260) =>
  IS_TEST ? Promise.resolve() : new Promise<void>((resolve) => setTimeout(resolve, min + Math.random() * spread));
