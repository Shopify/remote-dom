import '@remote-dom/core/polyfill';
import {retain, createThreadFromWebWorker} from '@quilted/threads';

import {
  RemoteRootElement,
  createRemoteElement,
} from '@remote-dom/core/elements';

customElements.define('remote-root', RemoteRootElement);

const TestElement = createRemoteElement({
  events: ['foo']
});

customElements.define('test-element', TestElement);

const TestParentElement = createRemoteElement({});

customElements.define('test-parent-element', TestParentElement);

createThreadFromWebWorker(self, {
  expose: {
    async render(connection) {
      retain(connection);

      const root = document.createElement('remote-root');
      root.connect(connection);

      const testParent = document.createElement('test-parent-element');

      testParent.addEventListener('foo', () => {
        console.log('foo listener on test-parent');
      });

      const test = document.createElement('test-element');

      // test.addEventListener('foo', () => {
      //   console.log('foo listener on test');
      // });

      testParent.append(test);

      root.append(testParent);
    },
  },
});
