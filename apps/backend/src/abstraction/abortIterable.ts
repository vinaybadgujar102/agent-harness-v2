function whenAborted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

export async function* takeUntilAbort<T>(
  source: AsyncIterable<T>,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const iterator = source[Symbol.asyncIterator]();

  if (!signal) {
    try {
      while (true) {
        const next = await iterator.next();
        if (next.done) return;
        yield next.value;
      }
    } finally {
      await iterator.return?.();
    }
    return;
  }

  if (signal.aborted) {
    void iterator.return?.();
    return;
  }

  try {
    while (!signal.aborted) {
      const next = await Promise.race([
        iterator.next(),
        whenAborted(signal).then(
          () => ({ done: true, value: undefined }) as IteratorResult<T>,
        ),
      ]);
      if (signal.aborted || next.done) return;
      yield next.value;
    }
  } finally {
    // ponytail: return() can hang if the source is stuck on a non-cancellable await.
    // Fire it so fetch/ReadableStream abort; do not wait.
    void iterator.return?.();
  }
}
