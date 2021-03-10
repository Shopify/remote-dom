import {createRemoteReceiver} from '../receiver';
import {ACTION_MOUNT} from '../types';

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
});
