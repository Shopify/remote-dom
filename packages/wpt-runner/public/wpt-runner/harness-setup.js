let __harnessReady = false;

function __afterWptHarness() {
  if (__harnessReady) return;
  __harnessReady = true;

  const originalSetup = setup;
  globalThis.setup = globalThis.window.setup = function (functionOrProperties) {
    if (arguments.length === 1 && typeof functionOrProperties === 'function') {
      return originalSetup(functionOrProperties, {});
    }
    return originalSetup.apply(this, arguments);
  };

  setup({output: false});
  add_completion_callback((tests, status) => {
    postMessage({
      type: 'complete',
      result: {
        tests: tests.map((test) => ({
          name: test.name,
          status: test.status,
          message: test.message,
          stack: test.stack,
        })),
        status: {
          status: status.status,
          message: status.message,
          stack: status.stack,
        },
      },
    });
  });
}
