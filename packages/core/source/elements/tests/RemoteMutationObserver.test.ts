// @vitest-environment jsdom

import {describe, expect, it, vi} from 'vitest';

import {RemoteMutationObserver} from '../RemoteMutationObserver.ts';
import {RemoteReceiver} from '../../receivers/RemoteReceiver.ts';
import {RemoteElement} from '../RemoteElement.ts';

class MyRemoteElement extends RemoteElement {
  static remoteAttributes = ['src'];
}

customElements.define('my-remote-element', MyRemoteElement);

describe('RemoteMutationObserver', () => {
  describe('observe()', () => {
    describe('initial children', () => {
      it('transports initial children when observing an element with existing children', () => {
        const receiver = new RemoteReceiver();
        const observer = new RemoteMutationObserver(receiver.connection);
        const container = document.createElement('div');

        // Setup initial children
        const child1 = document.createElement('span');
        child1.textContent = 'Child 1';
        const child2 = document.createElement('div');
        child2.textContent = 'Child 2';
        const textNode = document.createTextNode('Text node');

        container.appendChild(child1);
        container.appendChild(textNode);
        container.appendChild(child2);

        observer.observe(container);

        expect(receiver.root.children).toHaveLength(3);
        expect(receiver.root.children[0]).toMatchObject({
          type: 1,
          element: 'span',
          children: [
            {
              type: 3,
              data: 'Child 1',
            },
          ],
        });
        expect(receiver.root.children[1]).toMatchObject({
          type: 3,
          data: 'Text node',
        });
        expect(receiver.root.children[2]).toMatchObject({
          type: 1,
          element: 'div',
          children: [
            {
              type: 3,
              data: 'Child 2',
            },
          ],
        });
      });

      it('does not transport initial children when initial option is false', () => {
        const receiver = new RemoteReceiver();
        const observer = new RemoteMutationObserver(receiver.connection);
        const container = document.createElement('div');
        const child = document.createElement('span');
        child.textContent = 'Child';
        container.appendChild(child);

        observer.observe(container, {initial: false});

        expect(receiver.root.children).toHaveLength(0);
      });

      it('does not transport initial children when element has no children', () => {
        const receiver = new RemoteReceiver();
        const observer = new RemoteMutationObserver(receiver.connection);
        const container = document.createElement('div');

        observer.observe(container);

        expect(receiver.root.children).toHaveLength(0);
      });

      it('transports nested initial children correctly', () => {
        const receiver = new RemoteReceiver();
        const observer = new RemoteMutationObserver(receiver.connection);
        const container = document.createElement('div');
        const child = document.createElement('div');
        const grandchild = document.createElement('span');
        grandchild.textContent = 'Grandchild';
        child.appendChild(grandchild);
        container.appendChild(child);

        observer.observe(container);

        expect(receiver.root.children).toHaveLength(1);
        expect(receiver.root.children[0]).toMatchObject({
          type: 1,
          element: 'div',
          children: [
            {
              type: 1,
              element: 'span',
              children: [
                {
                  type: 3,
                  data: 'Grandchild',
                },
              ],
            },
          ],
        });
      });
    });

    describe('multiple children', () => {
      it('sends custom ID elements as separate children to root when not using ROOT_ID', () => {
        const receiver = new RemoteReceiver();
        const observer = new RemoteMutationObserver(receiver.connection);
        const container = document.createElement('div');
        const child1 = document.createElement('span');
        child1.textContent = 'Child 1';
        const child2 = document.createElement('div');
        child2.textContent = 'Child 2';

        container.appendChild(child1);
        container.appendChild(child2);

        observer.observe(container, {id: 'custom-root'});

        expect(receiver.root.children).toHaveLength(1);
        expect(receiver.root.children[0]).toMatchObject({
          id: 'custom-root',
          type: 1,
          element: 'div',
          children: [
            {
              type: 1,
              element: 'span',
              children: [
                {
                  type: 3,
                  data: 'Child 1',
                },
              ],
            },
            {
              type: 1,
              element: 'div',
              children: [
                {
                  type: 3,
                  data: 'Child 2',
                },
              ],
            },
          ],
        });
      });
    });

    it('passes through mutation observer options', () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const spy = vi.spyOn(MutationObserver.prototype, 'observe');

      observer.observe(container, {
        subtree: false,
        childList: false,
        attributes: true,
        characterData: false,
      });

      expect(spy).toHaveBeenCalledWith(container, {
        subtree: false,
        childList: false,
        attributes: true,
        characterData: false,
      });

      spy.mockRestore();
    });

    it('defaults to observing all mutation types', () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const spy = vi.spyOn(MutationObserver.prototype, 'observe');

      observer.observe(container);

      expect(spy).toHaveBeenCalledWith(container, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });

      spy.mockRestore();
    });
  });

  describe('updates', () => {
    it('handles child insertion', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');

      observer.observe(container);

      const newChild = document.createElement('span');
      newChild.textContent = 'New child';

      container.appendChild(newChild);
      await flushMutationObserver(observer);

      expect(receiver.root.children).toHaveLength(1);
      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'span',
        children: [
          {
            type: 3,
            data: 'New child',
          },
        ],
      });
    });

    it('handles child removal', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const child = document.createElement('span');
      child.textContent = 'Child to remove';
      container.appendChild(child);

      observer.observe(container);

      expect(receiver.root.children).toHaveLength(1);

      container.removeChild(child);
      await flushMutationObserver(observer);

      expect(receiver.root.children).toHaveLength(0);
    });

    it('handles text content updates', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const textNode = document.createTextNode('Initial text');
      container.appendChild(textNode);

      observer.observe(container);

      expect(receiver.root.children[0]).toMatchObject({
        type: 3,
        data: 'Initial text',
      });

      textNode.textContent = 'Updated text';
      await flushMutationObserver(observer);

      expect(receiver.root.children[0]).toMatchObject({
        type: 3,
        data: 'Updated text',
      });
    });

    it('handles attribute updates', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const element = document.createElement('my-remote-element');
      element.setAttribute('src', 'https://example.com');
      container.appendChild(element);

      observer.observe(container);

      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'my-remote-element',
        attributes: {
          src: 'https://example.com',
        },
      });

      element.setAttribute('src', 'https://example.com/updated');
      await flushMutationObserver(observer);

      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'my-remote-element',
        attributes: {
          src: 'https://example.com/updated',
        },
      });
    });

    it('handles attribute removal', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const element = document.createElement('my-remote-element');
      element.setAttribute('src', 'https://example.com');
      container.appendChild(element);

      observer.observe(container);

      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'my-remote-element',
        attributes: {
          src: 'https://example.com',
        },
      });

      element.removeAttribute('src');
      await flushMutationObserver(observer);

      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'my-remote-element',
        attributes: {},
      });
    });

    it('handles nested child insertion', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const parent = document.createElement('div');
      container.appendChild(parent);

      observer.observe(container);
      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'div',
        children: [],
      });

      const child = document.createElement('span');
      child.textContent = 'Nested child';
      parent.appendChild(child);
      await flushMutationObserver(observer);

      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'div',
        children: [
          {
            type: 1,
            element: 'span',
            children: [
              {
                type: 3,
                data: 'Nested child',
              },
            ],
          },
        ],
      });
    });

    it('batches multiple mutations in a single call', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('div');

      observer.observe(container);

      container.appendChild(child1);
      container.appendChild(child2);
      await flushMutationObserver(observer);

      expect(receiver.root.children).toHaveLength(2);
      expect(receiver.root.children[0]).toMatchObject({
        type: 1,
        element: 'span',
      });
      expect(receiver.root.children[1]).toMatchObject({
        type: 1,
        element: 'div',
      });
    });
  });

  describe('disconnect()', () => {
    it('disconnects without emptying when empty option is false', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const child = document.createElement('span');
      container.appendChild(child);

      observer.observe(container);
      expect(receiver.root.children).toHaveLength(1);

      observer.disconnect({empty: false});

      // Children should still be there
      expect(receiver.root.children).toHaveLength(1);
    });

    it('empties observed nodes when empty option is true', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const child = document.createElement('span');
      container.appendChild(child);

      observer.observe(container);
      expect(receiver.root.children).toHaveLength(1);

      observer.disconnect({empty: true});

      expect(receiver.root.children).toHaveLength(0);
    });

    it('empties multiple observed nodes when empty option is true', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');
      const container2 = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('div');

      container.appendChild(child1);
      container2.appendChild(child2);

      observer.observe(container);
      observer.observe(container2, {id: 'custom-id'});
      expect(receiver.root.children).toHaveLength(2);

      observer.disconnect({empty: true});

      expect(receiver.root.children).toHaveLength(0);
    });

    it('stops observing mutations after disconnect', async () => {
      const receiver = new RemoteReceiver();
      const observer = new RemoteMutationObserver(receiver.connection);
      const container = document.createElement('div');

      observer.observe(container);

      const child = document.createElement('span');
      container.appendChild(child);

      observer.disconnect();

      expect(receiver.root.children).toHaveLength(0);
    });
  });
});

async function flushMutationObserver(_observer: MutationObserver) {
  // Observer fires in a tick after the current task, so we delay
  // just long enough for that to run.
  await new Promise((resolve) => setTimeout(resolve, 0));
}
