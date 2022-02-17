import {fromMessagePort} from '../adaptors';

import {MessageChannel} from './utilities';

describe('fromMessagePort()', () => {
  it('starts the port', async () => {
    const {port1} = new MessageChannel();
    jest.spyOn(port1, 'start');

    fromMessagePort(port1);
    expect(port1.start).toHaveBeenCalled();
  });
});
