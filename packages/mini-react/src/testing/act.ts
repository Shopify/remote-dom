import options from '../options';

type OptionsTestExtensions = typeof options & {
  __test__previousDebounce?: typeof options['debounceRendering'];
  __test__drainQueue?(): void;
};

/**
 * Setup a rerender function that will drain the queue of pending renders
 */
export function setupRerender() {
  (options as OptionsTestExtensions).__test__previousDebounce =
    options.debounceRendering;

  options.debounceRendering = (cb) => {
    (options as OptionsTestExtensions).__test__drainQueue = cb;
    return cb;
  };

  return () => (options as OptionsTestExtensions).__test__drainQueue?.();
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value != null && typeof (value as any).then === 'function';

/** Depth of nested calls to `act`. */
let actDepth = 0;

/**
 * Run a test function, and flush all effects and rerenders after invoking it.
 *
 * Returns a Promise which resolves "immediately" if the callback is
 * synchronous or when the callback's result resolves if it is asynchronous.
 */
export function act(cb: () => void | Promise<void>) {
  if (++actDepth > 1) {
    // If calls to `act` are nested, a flush happens only when the
    // outermost call returns. In the inner call, we just execute the
    // callback and return since the infrastructure for flushing has already
    // been set up.
    //
    // If an exception occurs, the outermost `act` will handle cleanup.
    const result = cb();
    if (isThenable(result)) {
      return result.then(() => {
        --actDepth;
      });
    }
    --actDepth;
    return Promise.resolve();
  }

  const previousRequestAnimationFrame = options.requestAnimationFrame;
  const rerender = setupRerender();

  let flush: Parameters<typeof requestAnimationFrame>[0] | undefined;
  let toFlush: Parameters<typeof requestAnimationFrame>[0];
  let error: Error | undefined;
  let result: any;

  // Override requestAnimationFrame so we can flush pending hooks.
  options.requestAnimationFrame = (fc) => {
    flush = fc;
    return 0;
  };

  const finish = () => {
    try {
      rerender();

      while (flush) {
        toFlush = flush;
        flush = undefined;

        toFlush(Date.now());
        rerender();
      }

      teardown();
    } catch (currentError) {
      if (!error) {
        error = currentError as Error;
      }
    }

    options.requestAnimationFrame = previousRequestAnimationFrame;
    --actDepth;
  };

  try {
    result = cb();
  } catch (currentError) {
    error = currentError as Error;
  }

  if (isThenable(result)) {
    return result.then(finish, (error) => {
      finish();
      throw error;
    });
  }

  // nb. If the callback is synchronous, effects must be flushed before
  // `act` returns, so that the caller does not have to await the result,
  // even though React recommends this.
  finish();

  if (error) {
    throw error;
  }

  return Promise.resolve();
}

/**
 * Teardown test environment and reset preact's internal state
 */
export function teardown() {
  const castOptions = options as OptionsTestExtensions;

  if (castOptions.__test__drainQueue) {
    // Flush any pending updates leftover by test
    castOptions.__test__drainQueue!();
    delete castOptions.__test__drainQueue;
  }

  if (typeof castOptions.__test__previousDebounce === 'undefined') {
    castOptions.debounceRendering = undefined;
  } else {
    castOptions.debounceRendering = castOptions.__test__previousDebounce;
    delete castOptions.__test__previousDebounce;
  }
}
