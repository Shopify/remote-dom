import {
  REMOTE_PROPERTIES,
  REMOTE_ATTRIBUTES,
  REMOTE_EVENT_LISTENERS,
} from '../constants.ts';
import {RemoteEvent} from './RemoteEvent.ts';
import {
  updateRemoteElementProperty,
  updateRemoteElementAttribute,
  updateRemoteElementEventListener,
  callRemoteElementMethod,
} from './internals.ts';

export interface RemoteElementPropertyType<Value = unknown> {
  parse?(value: string | unknown): Value;
  serialize?(value: Value): string | unknown;
}

export type RemoteElementPropertyTypeOrBuiltIn<Value = unknown> =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Object
  | typeof Array
  | typeof Function
  | RemoteElementPropertyType<Value>;

export interface RemoteElementPropertyDefinition<Value = unknown> {
  type?: RemoteElementPropertyTypeOrBuiltIn<Value>;
  alias?: string[];
  /**
   * @deprecated Use `RemoteElement.eventListeners` instead.
   */
  event?: boolean | string;
  attribute?: string | boolean;
  default?: Value;
}

interface RemoteElementPropertyNormalizedDefinition<Value = unknown> {
  name: string;
  type: RemoteElementPropertyTypeOrBuiltIn<Value>;
  alias?: string[];
  event?: string;
  attribute?: string;
  default?: Value;
}

export type RemoteElementPropertiesDefinition<
  Properties extends Record<string, any> = {},
> = {
  [Property in keyof Properties]: RemoteElementPropertyDefinition<
    Properties[Property]
  >;
};

export interface RemoteElementSlotDefinition {}

export interface RemoteElementAttributeDefinition {}

export interface RemoteElementEventListenerDefinition {
  dispatchEvent?: (
    this: RemoteElement<any, any, any>,
    arg: any,
  ) => Event | undefined | void;
}

export type RemoteElementEventListenersDefinition<
  EventListeners extends Record<string, any> = {},
> = {
  [Event in keyof EventListeners]: RemoteElementEventListenerDefinition;
};

export interface RemoteElementMethodDefinition {}

export type RemoteElementSlotsDefinition<
  Slots extends Record<string, any> = {},
> = {
  [Slot in keyof Slots]: RemoteElementSlotDefinition;
};

export type RemoteElementMethodsDefinition<
  Slots extends Record<string, any> = {},
> = {
  [Slot in keyof Slots]: RemoteElementMethodDefinition;
};

export type RemotePropertiesFromElementConstructor<T> = T extends {
  new (): RemoteElement<infer Properties, any, any, any>;
}
  ? Properties
  : never;

export type RemoteMethodsFromElementConstructor<T> = T extends {
  new (): RemoteElement<any, infer Methods, any, any>;
}
  ? Methods
  : never;

export type RemoteSlotsFromElementConstructor<T> = T extends {
  new (): RemoteElement<any, any, infer Slots, any>;
}
  ? Slots
  : never;

export type RemoteEventListenersFromElementConstructor<T> = T extends {
  new (): RemoteElement<any, any, any, infer EventListeners>;
}
  ? EventListeners
  : never;

export type RemoteElementConstructor<
  Properties extends Record<string, any> = {},
  Methods extends Record<string, (...args: any[]) => any> = {},
  Slots extends Record<string, any> = {},
  EventListeners extends Record<string, any> = {},
> = {
  new (): RemoteElement<Properties, Methods, Slots, EventListeners> &
    Properties &
    Methods;
  readonly remoteSlots?:
    | RemoteElementSlotsDefinition<Slots>
    | readonly (keyof Slots)[];
  readonly remoteSlotDefinitions: Map<string, RemoteElementSlotDefinition>;

  readonly remoteProperties?:
    | RemoteElementPropertiesDefinition<Properties>
    | readonly (keyof Properties)[];
  readonly remotePropertyDefinitions: Map<
    string,
    RemoteElementPropertyNormalizedDefinition
  >;

  readonly remoteAttributes?: readonly string[];
  readonly remoteAttributeDefinitions: Map<
    string,
    RemoteElementAttributeDefinition
  >;

  readonly remoteEventListeners?:
    | RemoteElementEventListenersDefinition<EventListeners>
    | readonly (keyof EventListeners)[];
  readonly remoteEventListenerDefinitions: Map<
    string,
    RemoteElementEventListenerDefinition
  >;

  readonly remoteMethods?: Methods | readonly (keyof Methods)[];
  createProperty<Value = unknown>(
    name: string,
    definition?: RemoteElementPropertyDefinition<Value>,
  ): void;
};

export interface RemoteElementCreatorOptions<
  Properties extends Record<string, any> = {},
  Methods extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
  EventListeners extends Record<string, any> = {},
> {
  slots?: RemoteElementConstructor<
    Properties,
    Methods,
    Slots,
    EventListeners
  >['remoteSlots'];
  properties?: RemoteElementConstructor<
    Properties,
    Methods,
    Slots,
    EventListeners
  >['remoteProperties'];
  attributes?: RemoteElementConstructor<
    Properties,
    Methods,
    Slots,
    EventListeners
  >['remoteAttributes'];
  eventListeners?: RemoteElementConstructor<
    Properties,
    Methods,
    Slots,
    EventListeners
  >['remoteEventListeners'];
  methods?: RemoteElementConstructor<
    Properties,
    Methods,
    Slots,
    EventListeners
  >['remoteMethods'];
}

const EMPTY_DEFINITION = Object.freeze({});

export function createRemoteElement<
  Properties extends Record<string, any> = {},
  Methods extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
  EventListeners extends Record<string, any> = {},
>({
  slots,
  properties,
  attributes,
  eventListeners,
  methods,
}: RemoteElementCreatorOptions<
  Properties,
  Methods,
  Slots,
  EventListeners
> = {}): RemoteElementConstructor<Properties, Methods, Slots, EventListeners> {
  const RemoteElementConstructor = class extends RemoteElement<
    Properties,
    Methods,
    Slots,
    EventListeners
  > {
    static readonly remoteSlots = slots;
    static readonly remoteProperties = properties;
    static readonly remoteAttributes = attributes;
    static readonly remoteEventListeners = eventListeners;
    static readonly remoteMethods = methods;
  } as any;

  return RemoteElementConstructor;
}

const SLOT_PROPERTY = 'slot';
const REMOTE_EVENTS = Symbol('remote.events');

interface RemoteEventRecord {
  readonly name: string;
  readonly property?: string;
  readonly definition?: RemoteElementEventListenerDefinition;
  readonly listeners: Set<EventListenerOrEventListenerObject>;
  dispatch(...args: any[]): unknown;
}

type RemoteEventListenerRecord = [
  EventListenerOrEventListenerObject,
  RemoteEventRecord,
];

// Heavily inspired by https://github.com/lit/lit/blob/343187b1acbbdb02ce8d01fa0a0d326870419763/packages/reactive-element/src/reactive-element.ts
// @ts-ignore-error
export abstract class RemoteElement<
  Properties extends Record<string, any> = {},
  Methods extends Record<string, (...args: any[]) => any> = {},
  Slots extends Record<string, any> = {},
  EventListeners extends Record<string, any> = {},
> extends HTMLElement {
  static readonly slottable = true;

  static readonly remoteSlots?: any;
  static readonly remoteProperties?: any;
  static readonly remoteAttributes?: any;
  static readonly remoteEventListeners?: any;
  static readonly remoteMethods?: any;

  static get observedAttributes() {
    return this.finalize().__observedAttributes;
  }

  static get remotePropertyDefinitions(): Map<
    string,
    RemoteElementPropertyNormalizedDefinition
  > {
    return this.finalize().__remotePropertyDefinitions;
  }

  static get remoteAttributeDefinitions(): Map<
    string,
    RemoteElementAttributeDefinition
  > {
    return this.finalize().__remoteAttributeDefinitions;
  }

  static get remoteEventListenerDefinitions(): Map<
    string,
    RemoteElementEventListenerDefinition
  > {
    return this.finalize().__remoteEventListenerDefinitions;
  }

  static get remoteSlotDefinitions(): Map<string, RemoteElementSlotDefinition> {
    return this.finalize().__remoteSlotDefinitions;
  }

  protected static __finalized = true;
  private static readonly __observedAttributes: string[] = [];
  private static readonly __attributeToPropertyMap = new Map<string, string>();
  private static readonly __eventToPropertyMap = new Map<string, string>();
  private static readonly __remotePropertyDefinitions = new Map<
    string,
    RemoteElementPropertyNormalizedDefinition
  >();
  private static readonly __remoteAttributeDefinitions = new Map<
    string,
    RemoteElementAttributeDefinition
  >();
  private static readonly __remoteEventListenerDefinitions = new Map<
    string,
    RemoteElementEventListenerDefinition
  >();
  private static readonly __remoteSlotDefinitions = new Map<
    string,
    RemoteElementSlotDefinition
  >();

  static createProperty<Value = unknown>(
    name: string,
    definition?: RemoteElementPropertyDefinition<Value>,
  ) {
    saveRemoteProperty(
      name,
      definition,
      this.observedAttributes,
      this.remotePropertyDefinitions,
      this.__attributeToPropertyMap,
      this.__eventToPropertyMap,
    );
  }

  protected static finalize(): typeof this {
    // eslint-disable-next-line no-prototype-builtins
    if (this.hasOwnProperty('__finalized')) {
      return this;
    }

    this.__finalized = true;
    const {
      remoteSlots,
      remoteProperties,
      remoteAttributes,
      remoteEventListeners,
      remoteMethods,
    } = this;

    // finalize any superclasses
    const SuperConstructor = Object.getPrototypeOf(
      this,
    ) as typeof RemoteElement;

    const observedAttributes = new Set<string>();
    const attributeToPropertyMap = new Map<string, string>();
    const eventToPropertyMap = new Map<string, string>();
    const remoteSlotDefinitions = new Map<
      string,
      RemoteElementSlotDefinition
    >();
    const remotePropertyDefinitions = new Map<
      string,
      RemoteElementPropertyNormalizedDefinition
    >();
    const remoteAttributeDefinitions = new Map<
      string,
      RemoteElementAttributeDefinition
    >();
    const remoteEventListenerDefinitions = new Map<
      string,
      RemoteElementEventListenerDefinition
    >();

    if (typeof SuperConstructor.finalize === 'function') {
      SuperConstructor.finalize();

      SuperConstructor.observedAttributes.forEach((attribute) => {
        observedAttributes.add(attribute);
      });

      SuperConstructor.remotePropertyDefinitions.forEach(
        (definition, property) => {
          remotePropertyDefinitions.set(property, definition);
        },
      );

      SuperConstructor.remoteAttributeDefinitions.forEach(
        (definition, event) => {
          remoteAttributeDefinitions.set(event, definition);
        },
      );

      SuperConstructor.remoteEventListenerDefinitions.forEach(
        (definition, event) => {
          remoteEventListenerDefinitions.set(event, definition);
        },
      );

      SuperConstructor.remoteSlotDefinitions.forEach((definition, slot) => {
        remoteSlotDefinitions.set(slot, definition);
      });
    }

    if (remoteSlots != null) {
      const slotNames = Array.isArray(remoteSlots)
        ? remoteSlots
        : Object.keys(remoteSlots);

      slotNames.forEach((slotName) => {
        remoteSlotDefinitions.set(slotName, EMPTY_DEFINITION);
      });
    }

    if (remoteProperties != null) {
      if (Array.isArray(remoteProperties)) {
        remoteProperties.forEach((propertyName) => {
          saveRemoteProperty(
            propertyName,
            undefined,
            observedAttributes,
            remotePropertyDefinitions,
            attributeToPropertyMap,
            eventToPropertyMap,
          );
        });
      } else {
        Object.keys(remoteProperties).forEach((propertyName) => {
          saveRemoteProperty(
            propertyName,
            (remoteProperties as any)[propertyName],
            observedAttributes,
            remotePropertyDefinitions,
            attributeToPropertyMap,
            eventToPropertyMap,
          );
        });
      }
    }

    if (remoteAttributes != null) {
      remoteAttributes.forEach((attribute: string) => {
        remoteAttributeDefinitions.set(attribute, EMPTY_DEFINITION);
        observedAttributes.add(attribute);
      });
    }

    if (remoteEventListeners != null) {
      if (Array.isArray(remoteEventListeners)) {
        remoteEventListeners.forEach((event: string) => {
          remoteEventListenerDefinitions.set(event, EMPTY_DEFINITION);
        });
      } else {
        Object.keys(remoteEventListeners).forEach((event) => {
          remoteEventListenerDefinitions.set(
            event,
            remoteEventListeners[event],
          );
        });
      }
    }

    if (remoteMethods != null) {
      if (Array.isArray(remoteMethods)) {
        for (const method of remoteMethods) {
          // @ts-expect-error We are dynamically defining methods, which TypeScript can’t
          // really keep track of.
          this.prototype[method] = function (
            this: RemoteElement,
            ...args: any[]
          ) {
            return this.callRemoteMethod(method, ...args);
          };
        }
      } else {
        Object.assign(this, remoteMethods);
      }
    }

    Object.defineProperties(this, {
      __observedAttributes: {
        value: [...observedAttributes],
        enumerable: false,
      },
      __remoteSlotDefinitions: {
        value: remoteSlotDefinitions,
        enumerable: false,
      },
      __remotePropertyDefinitions: {
        value: remotePropertyDefinitions,
        enumerable: false,
      },
      __remoteAttributeDefinitions: {
        value: remoteAttributeDefinitions,
        enumerable: false,
      },
      __remoteEventListenerDefinitions: {
        value: remoteEventListenerDefinitions,
        enumerable: false,
      },
      __attributeToPropertyMap: {
        value: attributeToPropertyMap,
        enumerable: false,
      },
      __eventToPropertyMap: {
        value: eventToPropertyMap,
        enumerable: false,
      },
    });

    return this;
  }

  get [SLOT_PROPERTY]() {
    return super.slot;
  }

  set [SLOT_PROPERTY](value: string) {
    const currentSlot = this.slot;
    const newSlot = String(value);

    if (currentSlot === newSlot) return;

    super.slot = value;

    if (!(this.constructor as typeof RemoteElement).slottable) {
      return;
    }

    updateRemoteElementAttribute(this, SLOT_PROPERTY, this.slot);
  }

  // Just need to use these types so TS doesn’t lose track of them.
  /** @internal */
  __slots?: Slots;

  /** @internal */
  __properties?: Properties;

  /** @internal */
  __methods?: Methods;

  /** @internal */
  __eventListeners?: EventListeners;

  private [REMOTE_PROPERTIES]!: Properties;
  // @ts-expect-error used by helpers in the `internals.ts` file
  private [REMOTE_ATTRIBUTES]!: Record<string, string>;
  private [REMOTE_EVENT_LISTENERS]!: Record<string, (...args: any[]) => any>;
  private [REMOTE_EVENTS]?: {
    readonly events: Map<string, RemoteEventRecord>;
    readonly listeners: WeakMap<
      EventListenerOrEventListenerObject,
      RemoteEventListenerRecord
    >;
  };

  constructor() {
    super();
    (this.constructor as typeof RemoteElement).finalize();

    const propertyDescriptors: PropertyDescriptorMap = {};

    propertyDescriptors[REMOTE_ATTRIBUTES] = {
      value: {},
      writable: true,
      configurable: true,
      enumerable: false,
    };

    propertyDescriptors[REMOTE_EVENT_LISTENERS] = {
      value: {},
      writable: true,
      configurable: true,
      enumerable: false,
    };

    const remoteProperties: Record<string, unknown> = {};
    propertyDescriptors[REMOTE_PROPERTIES] = {
      value: remoteProperties,
      writable: true,
      configurable: true,
      enumerable: false,
    };

    for (const [property, description] of (
      this.constructor as typeof RemoteElement
    ).remotePropertyDefinitions.entries()) {
      const aliasedName = description.name;

      // Don’t override actual accessors. This is handled by the
      // `remoteProperty()` decorator applied to the accessor.
      // eslint-disable-next-line no-prototype-builtins
      if (Object.getPrototypeOf(this).hasOwnProperty(property)) {
        continue;
      }

      if (property === aliasedName) {
        remoteProperties[property] = description.default;
      }

      const propertyDescriptor = {
        configurable: true,
        enumerable: property === aliasedName,
        get: () => {
          return this[REMOTE_PROPERTIES][aliasedName];
        },
        set: (value: any) => {
          updateRemoteElementProperty(this, aliasedName, value);
        },
      };

      propertyDescriptors[property] = propertyDescriptor;
    }

    Object.defineProperties(this, propertyDescriptors);
  }

  attributeChangedCallback(attribute: string, _oldValue: any, newValue: any) {
    const {
      remotePropertyDefinitions,
      remoteAttributeDefinitions,
      __attributeToPropertyMap: attributeToPropertyMap,
    } = this.constructor as typeof RemoteElement;

    if (remoteAttributeDefinitions.has(attribute)) {
      updateRemoteElementAttribute(this, attribute, newValue);
      return;
    }

    const property = attributeToPropertyMap.get(attribute);

    const propertyDefinition =
      property == null ? property : remotePropertyDefinitions.get(property);

    if (propertyDefinition == null) return;

    (this as any)[property!] = convertAttributeValueToProperty(
      newValue,
      propertyDefinition.type,
    );
  }

  addEventListener(
    type: string,
    listener:
      | ((event: RemoteEvent) => void)
      | {handleEvent: (event: RemoteEvent) => void}
      | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    const {
      remoteEventListenerDefinitions,
      __eventToPropertyMap: eventToPropertyMap,
    } = this.constructor as typeof RemoteElement;

    const listenerDefinition = remoteEventListenerDefinitions.get(type);
    const property = eventToPropertyMap.get(type);

    if (listenerDefinition == null && property == null) {
      return super.addEventListener(type, listener, options);
    }

    let remoteEvents = this[REMOTE_EVENTS];
    if (remoteEvents == null) {
      remoteEvents = {events: new Map(), listeners: new WeakMap()};
      this[REMOTE_EVENTS] = remoteEvents;
    }

    let remoteEvent = remoteEvents.events.get(type);
    if (remoteEvent == null) {
      remoteEvent = {
        name: type,
        property,
        definition: listenerDefinition,
        listeners: new Set(),
        dispatch: (arg: any) => {
          const event =
            listenerDefinition?.dispatchEvent?.call(this, arg) ??
            new RemoteEvent(type, {detail: arg});

          this.dispatchEvent(event);

          return (event as any).response;
        },
      };

      remoteEvents.events.set(type, remoteEvent);
    }

    const normalizedListener =
      typeof options === 'object' && options?.once
        ? (...args: Parameters<EventListener>) => {
            const result =
              typeof listener === 'object'
                ? listener.handleEvent(...args)
                : listener.call(this, ...args);
            removeRemoteListener.call(this, type, listener, listenerRecord);
            return result;
          }
        : listener;

    const listenerRecord: RemoteEventListenerRecord = [
      normalizedListener,
      remoteEvent,
    ];

    remoteEvent.listeners.add(listener);
    remoteEvents.listeners.set(listener, listenerRecord);

    super.addEventListener(type, normalizedListener, options);

    if (typeof options === 'object' && options.signal) {
      options.signal.addEventListener(
        'abort',
        () => {
          removeRemoteListener.call(this, type, listener, listenerRecord);
        },
        {once: true},
      );
    }

    if (listenerDefinition) {
      updateRemoteElementEventListener(this, type, remoteEvent.dispatch);
    } else {
      updateRemoteElementProperty(this, property!, remoteEvent.dispatch);
    }
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) {
    const remoteEvents = this[REMOTE_EVENTS];
    const listenerRecord = remoteEvents?.listeners.get(listener);
    const normalizedListener = listenerRecord ? listenerRecord[0] : listener;

    super.removeEventListener(type, normalizedListener, options);

    if (listenerRecord == null) return;

    removeRemoteListener.call(this, type, listener, listenerRecord);
  }

  updateRemoteProperty(name: string, value?: unknown) {
    updateRemoteElementProperty(this, name, value);
  }

  updateRemoteAttribute(name: string, value?: string) {
    updateRemoteElementAttribute(this, name, value);
  }

  callRemoteMethod(method: string, ...args: any[]) {
    return callRemoteElementMethod(this, method, ...args);
  }
}

function removeRemoteListener(
  this: RemoteElement<any, any>,
  type: string,
  listener: EventListenerOrEventListenerObject,
  listenerRecord: RemoteEventListenerRecord,
) {
  const remoteEvents = this[REMOTE_EVENTS]!;

  const remoteEvent = listenerRecord[1];
  remoteEvent.listeners.delete(listener);
  remoteEvents.listeners.delete(listener);

  if (remoteEvent.listeners.size > 0) return;

  remoteEvents.events.delete(type);

  if (remoteEvent.property) {
    if (
      this[REMOTE_PROPERTIES][remoteEvent.property] === remoteEvent.dispatch
    ) {
      updateRemoteElementProperty(this, remoteEvent.property, undefined);
    }
  } else {
    if (this[REMOTE_EVENT_LISTENERS][type] === remoteEvent.dispatch) {
      updateRemoteElementEventListener(this, type, undefined);
    }
  }
}

function saveRemoteProperty<Value = unknown>(
  name: string,
  description: RemoteElementPropertyDefinition<Value> | undefined,
  observedAttributes: Set<string> | string[],
  remotePropertyDefinitions: Map<
    string,
    RemoteElementPropertyNormalizedDefinition
  >,
  attributeToPropertyMap: Map<string, string>,
  eventToPropertyMap: Map<string, string>,
) {
  if (remotePropertyDefinitions.has(name)) {
    return remotePropertyDefinitions.get(name)!;
  }

  const looksLikeEventCallback = name[0] === 'o' && name[1] === 'n';

  const resolvedDescription =
    description ?? ({} as RemoteElementPropertyDefinition<Value>);
  let {alias} = resolvedDescription;
  const {
    type = looksLikeEventCallback ? Function : String,
    attribute = type !== Function,
    event = looksLikeEventCallback,
    default: defaultValue = type === Boolean ? false : undefined,
  } = resolvedDescription;

  if (alias == null) {
    // Svelte lowercases property names before assigning them to elements,
    // this ensures that those properties are forwarded to their canonical
    // names.
    const lowercaseProperty = name.toLowerCase();
    if (lowercaseProperty !== name) {
      alias = [lowercaseProperty];
    }

    // Preact (and others) automatically treat properties that start with
    // `on` as being event listeners, and uses an actual event listener for
    // them. This alias gives wrapping components an alternative property
    // to write to that won't be treated as an event listener.
    if (looksLikeEventCallback) {
      alias ??= [];
      alias.unshift(`_${name}`);
    }
  }

  let attributeName: string | undefined;

  if (attribute === true) {
    attributeName = camelToKebabCase(name);
  } else if (typeof attribute === 'string') {
    attributeName = attribute;
  }

  if (attributeName) {
    if (Array.isArray(observedAttributes)) {
      observedAttributes.push(attributeName);
    } else {
      observedAttributes.add(attributeName);
    }

    attributeToPropertyMap.set(attributeName, name);
  }

  let eventName: string | undefined;

  if (event === true) {
    eventName = camelToKebabCase(looksLikeEventCallback ? name.slice(2) : name);
  } else if (typeof event === 'string') {
    eventName = event;
  }

  if (eventName) {
    eventToPropertyMap.set(eventName, name);
  }

  const definition: RemoteElementPropertyNormalizedDefinition = {
    name,
    type,
    alias,
    event: eventName,
    attribute: attributeName,
    default: defaultValue,
  };

  remotePropertyDefinitions.set(name, definition);

  if (alias) {
    for (const propertyAlias of alias) {
      remotePropertyDefinitions.set(propertyAlias, definition);
    }
  }

  return definition;
}

function convertAttributeValueToProperty<Value = unknown>(
  value: string | null,
  type: RemoteElementPropertyTypeOrBuiltIn<Value>,
) {
  if (value == null) return undefined;

  switch (type) {
    case Boolean:
      return value != null && value !== 'false';
    case Object:
    case Array:
      try {
        return JSON.parse(value);
      } catch {
        return undefined;
      }
    case String:
      return String(value);
    case Number:
      return Number.parseFloat(value);
    case Function:
      return undefined;
    default: {
      return (type as RemoteElementPropertyType<Value>).parse?.(value);
    }
  }
}

function camelToKebabCase(str: string) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
