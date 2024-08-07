export {
  RemoteElement,
  createRemoteElement,
  type RemoteElementConstructor,
  type RemoteElementPropertyType,
  type RemoteElementPropertyDefinition,
  type RemoteElementPropertiesDefinition,
  type RemoteElementSlotDefinition,
  type RemoteElementSlotsDefinition,
  type RemotePropertiesFromElementConstructor,
  type RemoteMethodsFromElementConstructor,
  type RemoteSlotsFromElementConstructor,
  type RemoteElementCreatorOptions,
} from './elements/RemoteElement.ts';
export {RemoteFragmentElement} from './elements/RemoteFragmentElement.ts';
export {RemoteRootElement} from './elements/RemoteRootElement.ts';
export {RemoteReceiverElement} from './elements/RemoteReceiverElement.ts';

export {RemoteEvent} from './elements/RemoteEvent.ts';
export {RemoteMutationObserver} from './elements/RemoteMutationObserver.ts';

export {
  connectRemoteNode,
  disconnectRemoteNode,
  serializeRemoteNode,
  updateRemoteElementProperty,
  callRemoteElementMethod,
} from './elements/internals.ts';

export {remoteSlots} from './elements/decorators/remote-slots.ts';
export {remoteProperties} from './elements/decorators/remote-properties.ts';
export {remoteProperty} from './elements/decorators/remote-property.ts';
export {customElement} from './elements/decorators/custom-element.ts';

export {BooleanOrString} from './elements/property-types/BooleanOrString.ts';

export type {RemoteConnection} from './types.ts';

export {BatchingRemoteConnection} from './elements/connection.ts';
