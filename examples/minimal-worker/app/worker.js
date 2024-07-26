import '@remote-dom/core/polyfill';
import {retain, createThreadFromWebWorker} from '@quilted/threads';

import {
  RemoteRootElement,
  createRemoteElement,
} from '@remote-dom/core/elements';

customElements.define('remote-root', RemoteRootElement);

const TestElement = createRemoteElement({
  attributes: ['foo'],
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

      const test = document.createElement('test-element');

      test.setAttribute('foo', 'bar');
      test.setAttribute('hello', 'world');

      setInterval(() => {
        console.log('attribute in remote:', test.getAttribute('foo'));
      }, 1000);

      testParent.append(test);

      root.append(testParent);
    },
  },
});
