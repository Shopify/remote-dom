import {createRemoteReceiver} from '../receiver';
import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  KIND_COMPONENT,
} from '../types';

describe('createRemoteReceiver()', () => {
  describe('state', () => {
    it('is `unmounted` while the mount() message has not been received', () => {
      const receiver = createRemoteReceiver();
      expect(receiver).toHaveProperty('state', 'unmounted');
    });

    it('is `mounted` once the mount() message has been received', () => {
      const receiver = createRemoteReceiver();
      receiver.receive(ACTION_MOUNT, []);
      expect(receiver).toHaveProperty('state', 'mounted');
    });
  });

  describe('removeChild', () => {
    it('removes a given child node', () => {
      const receiver = createRemoteReceiver();
      receiver.receive(ACTION_MOUNT, [
        {
          id: 'child1',
          children: [],
          kind: KIND_COMPONENT,
          props: {},
          type: '',
        },
      ]);

      expect(receiver.attached.root.children).toHaveLength(1);
      expect(receiver.attached.root.children[0].id).toBe('child1');

      receiver.receive(
        ACTION_INSERT_CHILD,
        undefined,
        0,
        {
          id: 'child2',
          children: [],
          kind: KIND_COMPONENT,
          props: {},
          type: '',
        },
        'child2',
      );

      expect(receiver.attached.root.children).toHaveLength(2);
      expect(receiver.attached.root.children[0].id).toBe('child2');
      expect(receiver.attached.root.children[1].id).toBe('child1');

      receiver.receive(ACTION_REMOVE_CHILD, undefined, 0);

      expect(receiver.attached.root.children).toHaveLength(1);
      expect(receiver.attached.root.children[0].id).toBe('child1');
    });

    it('handles a missing child', () => {
      const receiver = createRemoteReceiver();
      receiver.receive(ACTION_MOUNT, []);
      receiver.receive(ACTION_REMOVE_CHILD, undefined, -1);

      expect(receiver.attached.root.children).toHaveLength(0);
    });
  });
});
