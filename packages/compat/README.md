# `@remote-dom/compat`

The `@remote-dom/compat` package provides helpers for adapting between Remote DOM and [`remote-ui`, the previous version of this project](https://github.com/Shopify/remote-dom/discussions/267). These utilities are offered to help you transition to Remote DOM, while continuing to support existing code that expects `remote-ui`-style APIs.

## Progressive migration from `remote-ui`’s `RemoteChannel` to Remote DOM’s `RemoteConnection`

The `RemoteChannel` and `RemoteConnection` types from `remote-ui` and Remote DOM serve the same purpose: they describe the minimal interface that a remote environment needs to communicate with a host. In Remote DOM, the `RemoteConnection` type has been enhanced in backwards-incompatible ways, in order to support [method calling](#remote-methods), batched updates, and more.

In `remote-ui`, you typically get a `RemoteChannel` function by accessing the `receiver` property on a `RemoteReceiver`, like this:

```ts
import {createRemoteReceiver} from '@remote-ui/core';

const receiver = createRemoteReceiver();
const channel = receiver.receive;

// Do something with the channel, typically by sending it to a remote environment:
sendChannelToRemoteEnvironment(channel);
```

You can migrate to use a Remote DOM [`RemoteReceiver`](#remotereceiver), [`DOMRemoteReceiver`](#domremotereceiver), or [`SignalRemoteReceiver`](/packages/signals/README.md#signalremotereceiver) class, while still supporting the `RemoteChannel` API, by using the `adaptToLegacyRemoteChannel()` function:

You can adapt a `RemoteConnection` to a `RemoteChannel` using this library’s `adaptToLegacyRemoteChannel()` function. This function takes a `RemoteConnection` and returns a `RemoteChannel`, which allows you to use a Remote DOM receiver class on the host, even if the remote environment is using `remote-ui`. This same technique works regardless of whether you are using the [`RemoteReceiver`](#remotereceiver), [`DOMRemoteReceiver`](#domremotereceiver), or [`SignalRemoteReceiver`](/packages/signals/README.md#signalremotereceiver) class.

```ts
import {DOMRemoteReceiver} from '@remote-dom/core/receivers';
import {adaptToLegacyRemoteChannel} from '@remote-dom/compat';

const receiver = new DOMRemoteReceiver();
const channel = adaptToLegacyRemoteChannel(receiver.connection);

// Same as before: do something with the channel
sendChannelToRemoteEnvironment(channel);
```

If you use `remote-ui`’s React bindings to render your UI on the host, you will also need to update that code to make use of the new Remote DOM versions of those bindings (available for [Preact](/packages/preact/README.md#host) and [React](/packages/react/README.md#host)). With this change made, though, you can now seamlessly support code written with `remote-ui` or Remote DOM, by using the more powerful Remote DOM receiver classes on the host and adapting them for legacy code.
