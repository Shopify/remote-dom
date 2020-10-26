import {createRemoteRoot} from '../root';
import {RemoteReceiver} from '../receiver';
import type {RemoteChannel, RemoteComponent} from '../types';

describe('root', () => {
  describe('createComponent()', () => {
    it('does not throw error when no allowed components are set', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        root.createComponent('Card');
      }).not.toThrowError();
    });

    it('does not throw error for allowed components', () => {
      const components = ['Card'];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Card');
      }).not.toThrowError();
    });

    it('throws error for not allowed components', () => {
      const components = ['Card'];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Button');
      }).toThrowError();
    });

    it('throws error when empty components is set', () => {
      const components: string[] = [];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Button');
      }).toThrowError();
    });
  });

  describe('createText()', () => {
    it('does not throw error when appending a child created by the remote root', () => {
      const components: string[] = [];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createText();
      }).not.toThrowError();
    });
  });

  describe('appendChild()', () => {
    it('does not throw error when appending a child created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        root.appendChild(card);
      }).not.toThrowError();
    });

    it('throws error when appending a child not created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = {} as any;
        root.appendChild(card);
      }).toThrowError();
    });
  });

  describe('insertChildBefore()', () => {
    it('does not throw error when calling insertChildBefore for a component created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const image = root.createComponent('Image');
        root.appendChild(image);
        root.insertChildBefore(card, image);
      }).not.toThrowError();
    });

    it('throws error when calling insertChildBefore for a component not created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const button = {} as any;
        root.appendChild(card);
        root.insertChildBefore(button, card);
      }).toThrowError();
    });
  });

  describe('hot-swapping', () => {
    it('hot-swaps function props', () => {
      const funcOne = jest.fn();
      const funcTwo = jest.fn();
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const button = root.createComponent('Button', {onPress: funcOne});

      root.appendChild(button);
      root.mount();

      // After this, the receiver will have the initial Button component
      receiver.flush();

      button.updateProps({onPress: funcTwo});

      (receiver.children[0] as any).props.onPress();

      expect(funcOne).not.toHaveBeenCalled();
      expect(funcTwo).toHaveBeenCalled();
    });

    it('hot-swaps function props nested in objects and arrays', () => {
      const funcOne = jest.fn();
      const funcTwo = jest.fn();
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const card = root.createComponent('Card', {
        actions: [{onAction: funcOne}],
      });

      root.appendChild(card);
      root.mount();

      // After this, the receiver will have the initial Card component
      receiver.flush();

      card.updateProps({actions: [{onAction: funcTwo}]});

      (receiver.children[0] as any).props.actions[0].onAction();

      expect(funcOne).not.toHaveBeenCalled();
      expect(funcTwo).toHaveBeenCalled();
    });
  });
});

function createDelayedReceiver() {
  const receiver = new RemoteReceiver();
  const enqueued = new Set<() => void>();

  return {
    get children() {
      return receiver.root.children;
    },
    receive: ((type, ...args) => {
      const perform = () => {
        receiver.receive(type, ...args);
        enqueued.delete(perform);
      };

      enqueued.add(perform);
    }) as RemoteChannel,
    flush() {
      const currentlyEnqueued = [...enqueued];
      enqueued.clear();

      for (const perform of currentlyEnqueued) {
        perform();
      }
    },
  };
}
