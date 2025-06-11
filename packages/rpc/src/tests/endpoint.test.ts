import {MessageEndpoint} from '../types';
import {createEndpoint, TERMINATE, MissingResolverError} from '../endpoint';
import {fromMessagePort} from '../adaptors';
import {release, retain} from '../memory';

import {MessageChannel} from './utilities';

describe('createEndpoint()', () => {
  it('calls the exposed API of the paired endpoint', async () => {
    const {port1, port2} = new MessageChannel();
    port1.start();
    port2.start();
    const endpoint1 = createEndpoint<{hello(): string}>(fromMessagePort(port1));
    const endpoint2 = createEndpoint(fromMessagePort(port2));

    const spy = jest.fn(() => 'world');
    endpoint2.expose({hello: spy});

    expect(await endpoint1.call.hello()).toBe('world');
  });

  describe('#replace()', () => {
    it('replaces the underlying messenger', async () => {
      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();

      const endpoint1 = createEndpoint<{hello(): string}>(
        fromMessagePort(port1),
      );
      const endpoint2 = createEndpoint(fromMessagePort(port2));
      endpoint2.expose({hello: () => 'world'});

      const {port1: newPort1, port2: newPort2} = new MessageChannel();
      newPort1.start();
      newPort2.start();
      endpoint1.replace(fromMessagePort(newPort1));
      endpoint2.replace(fromMessagePort(newPort2));

      expect(await endpoint1.call.hello()).toBe('world');
    });
  });

  describe('#expose()', () => {
    it('allows a new method to be called from the paired endpoint', async () => {
      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();

      const endpoint1 = createEndpoint<{hello(): string}>(
        fromMessagePort(port1),
      );
      const endpoint2 = createEndpoint(createCatchingMessageEndpoint(port2));

      await expect(endpoint1.call.hello()).rejects.toMatchObject({
        message: expect.stringContaining('hello'),
      });

      endpoint2.expose({hello: () => 'world'});

      expect(await endpoint1.call.hello()).toBe('world');
    });

    it('re-throws errors thrown in exposed methods', async () => {
      expect.assertions(2);
      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();

      const endpoint1 = createEndpoint<{hello(): string}>(
        fromMessagePort(port1),
      );

      const messageEndpoint2 = fromMessagePort(port2);
      const endpoint2 = createEndpoint({
        ...messageEndpoint2,
        addEventListener(event, listener) {
          messageEndpoint2.addEventListener(event, async (...args) => {
            await expect(listener(...args)).rejects.toMatchObject({
              message: expect.stringContaining('this is broken'),
            });
          });
        },
      });

      endpoint2.expose({
        hello: () => {
          throw new Error('this is broken');
        },
      });

      await expect(endpoint1.call.hello()).rejects.toMatchObject({
        message: expect.stringContaining('this is broken'),
      });
    });

    it('deletes an exposed value by passing undefined', async () => {
      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();

      const endpoint1 = createEndpoint<{hello(): string}>(
        fromMessagePort(port1),
      );
      const endpoint2 = createEndpoint(createCatchingMessageEndpoint(port2));

      endpoint2.expose({hello: () => 'world'});
      endpoint2.expose({hello: undefined});

      await expect(endpoint1.call.hello()).rejects.toMatchObject({
        message: expect.stringContaining('hello'),
      });
    });
  });

  describe('#terminate()', () => {
    it('calls terminate on the message endpoint', () => {
      const {port1} = new MessageChannel();
      port1.start();
      const messenger = fromMessagePort(port1);
      const endpoint = createEndpoint(messenger);

      const spy = jest.spyOn(messenger, 'terminate');

      endpoint.terminate();
      expect(spy).toHaveBeenCalled();
    });

    it('calls terminate on the encoding strategy', () => {
      const spy = jest.fn();
      const {port1} = new MessageChannel();
      port1.start();
      const endpoint = createEndpoint(fromMessagePort(port1), {
        createEncoder: () => ({terminate: spy} as any),
      });

      endpoint.terminate();
      expect(spy).toHaveBeenCalled();
    });

    it('throws an error when calling a method on a terminated endpoint', async () => {
      const {port1} = new MessageChannel();
      port1.start();
      const endpoint = createEndpoint<{hello(): string}>(
        fromMessagePort(port1),
      );

      endpoint.terminate();

      await expect(endpoint.call.hello()).rejects.toMatchObject({
        message: expect.stringContaining('terminated'),
      });
    });

    it('sends the terminate method between endpoints', async () => {
      const {port1} = new MessageChannel();
      port1.start();

      const endpoint = createEndpoint<{callMe(): () => void}>(
        fromMessagePort(port1),
      );

      const messageSpy = jest.spyOn(port1, 'postMessage');

      endpoint.terminate();

      expect(messageSpy).toHaveBeenCalledWith([TERMINATE], undefined);
    });

    it('does not send memory management messages to a terminated endpoint', async () => {
      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();

      const endpoint1 = createEndpoint<{callMe(): () => void}>(
        fromMessagePort(port1),
      );

      const endpoint2 = createEndpoint(fromMessagePort(port2));
      endpoint2.expose({
        callMe() {
          return () => {};
        },
      });

      const callMeBack = await endpoint1.call.callMe();
      retain(callMeBack);

      endpoint1.terminate();

      const port1MessageSpy = jest.spyOn(port1, 'postMessage');

      release(callMeBack);

      expect(port1MessageSpy).not.toHaveBeenCalled();
    });

    it('throws a MissingResolverError error when calling a function that is no longer registered', async () => {
      const {port1} = new MessageChannel();
      port1.start();
      const messenger = fromMessagePort(port1);
      createEndpoint(messenger);

      await expect(
        // @ts-expect-error Accessing private property for testing - we need to simulate a message event
        (port1.listeners as Set<EventListener>).values().next().value!({
          data: [1, ['callId']],
        } as any),
      ).rejects.toBeInstanceOf(MissingResolverError);
    });

    it('does not process messages after the endpoint is terminated', async () => {
      const {port1, port2} = new MessageChannel();
      port1.start();
      port2.start();

      const endpoint1 = createEndpoint<{hello(): string}>(
        fromMessagePort(port1),
      );
      const endpoint2 = createEndpoint(fromMessagePort(port2));

      const spy = jest.fn(() => 'world');
      endpoint2.expose({hello: spy});

      endpoint2.terminate();

      // Try to call a method after termination
      await expect(endpoint1.call.hello()).rejects.toMatchObject({
        message: expect.stringContaining('terminated'),
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });
});

function createCatchingMessageEndpoint(
  messagePort: MessagePort,
): MessageEndpoint {
  const messageEndpoint = fromMessagePort(messagePort);

  return {
    ...messageEndpoint,
    addEventListener: (event, listener) => {
      messageEndpoint.addEventListener(event, async (...args) => {
        try {
          await listener(...args);
          // eslint-disable-next-line no-empty
        } catch {}
      });
    },
  };
}
