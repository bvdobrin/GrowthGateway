const IS_TEST = import.meta.env.MODE === 'test';

/** Simulated network latency for the mock backend. */
export const delay = (min = 120, spread = 260, signal?: AbortSignal) => {
  if (IS_TEST) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    let timer = 0;
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
    };
    timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, min + Math.random() * spread);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
};
