// Make the react build believe that it is running in a page context,
// otherwise react rendering errors won't be logged. This code MUST
// be in the global scope, to ensure that it is run before react
// initializes. This is especially important when bundlers are used
// which will re-order modules by execution priority.
//
// React logic we're working around:
// https://github.com/facebook/react/blob/4e6eec69be632c0c0177c5b1c8a70397d92ee181/packages/shared/invokeGuardedCallbackImpl.js#L53-L237
//
// On top of that we also need to ensure that we only patch it when
// not running inside a worker
if (
  'importScripts' in globalThis &&
  !('window' in globalThis) &&
  !('document' in globalThis)
) {
  class FakeDocument {
    createEvent(type: string) {
      return new Event(type);
    }

    createElement() {
      return new EventTarget();
    }
  }

  globalThis.window = globalThis as any;
  globalThis.document = new FakeDocument() as any;
}

export {};
