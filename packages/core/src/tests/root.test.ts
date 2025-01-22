import {createRemoteRoot} from '../root';
import {createRemoteReceiver} from '../receiver';
import type {RemoteChannel} from '../types';

describe('root', () => {
  describe('createComponent()', () => {
    it('does not throw error when no allowed components are set', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        root.createComponent('Card');
      }).not.toThrow();
    });

    it('does not throw error for allowed components', () => {
      const components = ['Card'];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Card');
      }).not.toThrow();
    });

    it('throws error for not allowed components', () => {
      const components = ['Card'];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Button');
      }).toThrow('Unsupported component: Button');
    });

    it('throws error when empty components is set', () => {
      const components: string[] = [];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createComponent('Button');
      }).toThrow('Unsupported component: Button');
    });
  });

  describe('createText()', () => {
    it('does not throw error when appending a child created by the remote root', () => {
      const components: string[] = [];
      const root = createRemoteRoot(() => {}, {components});

      expect(() => {
        root.createText();
      }).not.toThrow();
    });
  });

  describe('append()', () => {
    it('does not throw error when appending a child created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        root.append(card);
      }).not.toThrow();
    });

    it('throws error when appending a child not created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = {} as any;
        root.append(card);
      }).toThrow(
        'Cannot append a node that was not created by this remote root',
      );
    });
  });

  describe('insertBefore()', () => {
    it('does not throw error when calling insertBefore for a component created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const image = root.createComponent('Image');
        root.append(image);
        root.insertBefore(card, image);
      }).not.toThrow();
    });

    it('throws error when calling insertBefore for a component not created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const button = {} as any;
        root.append(card);
        root.insertBefore(button, card);
      }).toThrow(
        'Cannot insert a node that was not created by this remote root',
      );
    });
  });

  describe('replaceChildren()', () => {
    it('does not throw error when calling insertBefore for a component created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const image = root.createComponent('Image');
        root.append(image);
        root.replaceChildren(card);
      }).not.toThrow();
    });

    it('throws error when calling insertBefore for a component not created by the remote root', () => {
      const root = createRemoteRoot(() => {});

      expect(() => {
        const card = root.createComponent('Card');
        const button = {} as any;
        root.append(card);
        root.replaceChildren(button);
      }).toThrow(
        'Cannot append a node that was not created by this remote root',
      );
    });
  });

  describe('removeChild', () => {
    it('does not call channel when child is not found', () => {
      const channelMock = jest.fn();
      const root = createRemoteRoot(channelMock);
      root.mount();
      // clear channel call from mount
      channelMock.mockClear();

      const card = root.createComponent('Card');
      root.removeChild(card);

      expect(channelMock).not.toHaveBeenCalled();
    });
  });

  describe('hot-swapping', () => {
    it('hot-swaps function props', () => {
      const funcOne = jest.fn();
      const funcTwo = jest.fn();
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const button = root.createComponent('Button', {onPress: funcOne});

      root.append(button);
      root.mount();

      // After this, the receiver will have the initial Button component
      receiver.flush();

      button.updateProps({onPress: funcTwo});

      (receiver.children[0] as any).props.onPress();

      expect(funcOne).not.toHaveBeenCalled();
      expect(funcTwo).toHaveBeenCalled();
    });

    it('hot-swaps function props nested in objects', () => {
      const funcOne = jest.fn();
      const funcTwo = jest.fn();
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const resourceList = root.createComponent('ResourceList', {
        filterControl: {
          onQueryChange: funcOne,
          queryValue: 'foo',
        },
      });

      root.append(resourceList);
      root.mount();

      resourceList.updateProps({
        filterControl: {
          onQueryChange: funcTwo,
          queryValue: 'bar',
        },
      });

      // After this, the receiver will have the initial ResourceList component
      receiver.flush();

      const receivedResourceList = receiver.children[0] as any;
      const queryValue = receivedResourceList.props.filterControl.queryValue;
      receivedResourceList.props.filterControl.onQueryChange();

      expect(queryValue).toBe('bar');
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

      root.append(card);
      root.mount();

      // After this, the receiver will have the initial Card component
      receiver.flush();

      card.updateProps({actions: [{onAction: funcTwo}]});

      (receiver.children[0] as any).props.actions[0].onAction();

      expect(funcOne).not.toHaveBeenCalled();
      expect(funcTwo).toHaveBeenCalled();
    });

    it('hot-swaps function props for arrays when the length increases', () => {
      const firstActionFuncOne = jest.fn();
      const firstActionFuncTwo = jest.fn();
      const secondActionFunc = jest.fn();
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const modal = root.createComponent('Modal', {
        secondaryActions: [{onAction: firstActionFuncOne}],
      });

      root.append(modal);
      root.mount();

      modal.updateProps({
        secondaryActions: [
          {onAction: firstActionFuncTwo},
          {onAction: secondActionFunc},
        ],
      });

      receiver.flush();

      const {
        secondaryActions: [firstAction, secondAction],
      } = (receiver.children[0] as any).props;

      firstAction.onAction();
      secondAction.onAction();

      expect(firstActionFuncOne).not.toHaveBeenCalled();
      expect(firstActionFuncTwo).toHaveBeenCalled();
      expect(secondActionFunc).toHaveBeenCalled();
    });

    it('hot-swaps function props for nested arrays', () => {
      const firstActionFuncOne = jest.fn();
      const firstActionFuncTwo = jest.fn();
      const secondActionFuncOne = jest.fn();
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const modal = root.createComponent('Modal', {
        actionGroups: [
          {
            actions: [{onAction: firstActionFuncOne}],
          },
        ],
      });

      root.append(modal);
      root.mount();

      modal.updateProps({
        actionGroups: [
          {
            actions: [
              {onAction: firstActionFuncTwo},
              {onAction: secondActionFuncOne},
            ],
          },
        ],
      });

      receiver.flush();

      const {
        actionGroups: [
          {
            actions: [actionOne, actionTwo],
          },
        ],
      } = (receiver.children[0] as any).props;

      actionOne.onAction();
      actionTwo.onAction();

      expect(firstActionFuncOne).not.toHaveBeenCalled();
      expect(firstActionFuncTwo).toHaveBeenCalled();

      expect(secondActionFuncOne).toHaveBeenCalled();
    });

    it('can handle recursive hot swapping', async () => {
      const funcOne = jest.fn();
      const objectOne = {func: funcOne};
      Reflect.defineProperty(objectOne, 'self', {
        value: objectOne,
        enumerable: true,
      });

      const funcTwo = jest.fn();
      const objectTwo = {func: funcTwo};
      Reflect.defineProperty(objectTwo, 'self', {
        value: [],
        enumerable: true,
      });

      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const button = root.createComponent('Button', {
        complexProp: objectOne,
      });

      root.append(button);
      root.mount();

      // After this, the receiver will have the initial Button component
      receiver.flush();

      await button.updateProps({complexProp: objectTwo});

      const currentProp = (receiver.children[0] as any).props.complexProp;
      currentProp.func();

      expect(funcOne).not.toHaveBeenCalled();
      expect(funcTwo).toHaveBeenCalled();
    });

    it('hot-swaps arrays of primitive values', () => {
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const component = root.createComponent('MyComponent', {
        array1: [1, 2, 3, 4],
        array2: [1, 2, 3, 4],
      });

      root.append(component);
      root.mount();

      component.updateProps({
        array1: [1, 2, 3, 4],
        array2: [1, 3, 4],
      });

      receiver.flush();

      const {array2} = (receiver.children[0] as any).props;

      expect(array2).toStrictEqual([1, 3, 4]);
    });

    it('hot-swaps arrays of primitive values nested in objects and arrays', () => {
      const receiver = createDelayedReceiver();

      const root = createRemoteRoot(receiver.receive);
      const component = root.createComponent('MyComponent', {
        arrays: [
          {
            array1: [1, 2, 3, 4],
            array2: [1, 2, 3, 4],
          },
        ],
      });

      root.append(component);
      root.mount();

      component.updateProps({
        arrays: [
          {
            array1: [1, 2, 3, 4],
            array2: [1, 3, 4],
          },
        ],
      });

      receiver.flush();

      const {arrays} = (receiver.children[0] as any).props;

      expect(arrays[0].array2).toStrictEqual(expect.arrayContaining([1, 3, 4]));
    });
  });
});

function createDelayedReceiver() {
  const receiver = createRemoteReceiver();
  const enqueued = new Set<() => void>();

  return {
    get children() {
      return receiver.attached.root.children;
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
