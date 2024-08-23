import {RemoteEvent} from './RemoteEvent.ts';
import {
  updateRemoteElementProperty,
  updateRemoteElementAttribute,
  updateRemoteElementEventListener,
  callRemoteElementMethod,
  remoteProperties as getRemoteProperties,
  remoteEventListeners as getRemoteEventListeners,
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
  bubbles?: boolean;
  property?: boolean | string;
  dispatchEvent?: (
    this: RemoteElement<any, any, any, any>,
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

  readonly remoteEvents?:
    | RemoteElementEventListenersDefinition<EventListeners>
    | readonly (keyof EventListeners)[];
  readonly remoteEventDefinitions: Map<
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
  events?: RemoteElementConstructor<
    Properties,
    Methods,
    Slots,
    EventListeners
  >['remoteEvents'];
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
  events,
  methods,
}: NoInfer<
  RemoteElementCreatorOptions<Properties, Methods, Slots, EventListeners>
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
    static readonly remoteEvents = events;
    static readonly remoteMethods = methods;
  } as any;

  return RemoteElementConstructor;
}

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
  static readonly remoteEvents?: any;
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

  static get remoteEventDefinitions(): Map<
    string,
    RemoteElementEventListenerDefinition
  > {
    return this.finalize().__remoteEventDefinitions;
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
  private static readonly __remoteEventDefinitions = new Map<
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
      slottable,
      remoteSlots,
      remoteProperties,
      remoteAttributes,
      remoteEvents,
      remoteMethods,
    } = this;

    // finalize any superclasses
    const SuperConstructor = Object.getPrototypeOf(
      this,
    ) as typeof RemoteElement;

    const observedAttributes = new Set<string>();
    if (slottable) observedAttributes.add('slot');

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
    const remoteEventDefinitions = new Map<
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

      SuperConstructor.remoteEventDefinitions.forEach((definition, event) => {
        remoteEventDefinitions.set(event, definition);
      });

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

    if (remoteEvents != null) {
      if (Array.isArray(remoteEvents)) {
        remoteEvents.forEach((event: string) => {
          remoteEventDefinitions.set(event, EMPTY_DEFINITION);
        });
      } else {
        Object.keys(remoteEvents).forEach((event) => {
          remoteEventDefinitions.set(event, remoteEvents[event]);
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
      __remoteEventDefinitions: {
        value: remoteEventDefinitions,
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

  // Just need to use these types so TS doesn’t lose track of them.
  /** @internal */
  __slots?: Slots;

  /** @internal */
  __properties?: Properties;

  /** @internal */
  __methods?: Methods;

  /** @internal */
  __eventListeners?: EventListeners;

  private [REMOTE_EVENTS]?: {
    readonly events: Map<string, RemoteEventRecord>;
    readonly properties: Map<string, ((event: any) => void) | null>;
    readonly listeners: WeakMap<
      EventListenerOrEventListenerObject,
      RemoteEventListenerRecord
    >;
  };

  constructor() {
    super();
    (this.constructor as typeof RemoteElement).finalize();

    const propertyDescriptors: PropertyDescriptorMap = {};
    const initialPropertiesToSet: Record<string, any> = {};

    const prototype = Object.getPrototypeOf(this);
    const ThisClass = this.constructor as typeof RemoteElement;

    for (const [
      property,
      description,
    ] of ThisClass.remotePropertyDefinitions.entries()) {
      const aliasedName = description.name;

      // Don’t override actual accessors. This is handled by the
      // `remoteProperty()` decorator applied to the accessor.
      // eslint-disable-next-line no-prototype-builtins
      if (prototype.hasOwnProperty(property)) {
        continue;
      }

      if (property === aliasedName) {
        initialPropertiesToSet[property] = description.default;
      }

      const propertyDescriptor = {
        configurable: true,
        enumerable: property === aliasedName,
        get: () => {
          return getRemoteProperties(this)?.[aliasedName];
        },
        set: (value: any) => {
          updateRemoteElementProperty(this, aliasedName, value);
        },
      };

      propertyDescriptors[property] = propertyDescriptor;
    }

    for (const [
      event,
      definition,
    ] of ThisClass.remoteEventDefinitions.entries()) {
      const propertyFromDefinition = definition.property ?? true;

      if (!propertyFromDefinition) continue;

      const property =
        propertyFromDefinition === true ? `on${event}` : propertyFromDefinition;

      propertyDescriptors[property] = {
        configurable: true,
        enumerable: true,
        get: () => {
          return getRemoteEvents(this).properties.get(property) ?? null;
        },
        set: (value: any) => {
          const remoteEvents = getRemoteEvents(this);
          const currentListener = remoteEvents.properties.get(property);

          if (typeof value === 'function') {
            // Wrapping this in a custom function so you can’t call `removeEventListener`
            // on it.
            function handler(this: any, ...args: any[]) {
              return value.call(this, ...args);
            }

            remoteEvents.properties.set(property, handler);
            this.addEventListener(event, handler);
          } else {
            remoteEvents.properties.delete(property);
          }

          if (currentListener) {
            this.removeEventListener(event, currentListener);
          }
        },
      };
    }

    Object.defineProperties(this, propertyDescriptors);
    Object.assign(this, initialPropertiesToSet);
  }

  attributeChangedCallback(attribute: string, _oldValue: any, newValue: any) {
    if (
      attribute === 'slot' &&
      (this.constructor as typeof RemoteElement).slottable
    ) {
      updateRemoteElementProperty(
        this,
        attribute,
        newValue ? String(newValue) : undefined,
      );

      return;
    }

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

  connectedCallback() {
    // Ensure a connection is made with the host environment, so that
    // the event will be emitted even if no listener is directly attached
    // to this element.
    for (const [event, descriptor] of (
      this.constructor as typeof RemoteElement
    ).remoteEventDefinitions.entries()) {
      if (descriptor.bubbles) {
        this.addEventListener(event, noopBubblesEventListener);
      }
    }
  }

  disconnectedCallback() {
    for (const [event, descriptor] of (
      this.constructor as typeof RemoteElement
    ).remoteEventDefinitions.entries()) {
      if (descriptor.bubbles) {
        this.removeEventListener(event, noopBubblesEventListener);
      }
    }
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
    const {remoteEventDefinitions, __eventToPropertyMap: eventToPropertyMap} =
      this.constructor as typeof RemoteElement;

    const listenerDefinition = remoteEventDefinitions.get(type);
    const property = eventToPropertyMap.get(type);

    if (listenerDefinition == null && property == null) {
      return super.addEventListener(type, listener, options);
    }

    const remoteEvents = getRemoteEvents(this);
    const remoteEvent = getRemoteEventRecord.call(this, type, {
      property,
      definition: listenerDefinition,
    });

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

function getRemoteEvents(element: RemoteElement<any, any, any, any>): {
  events: Map<string, RemoteEventRecord>;
  properties: Map<string, ((event: any) => void) | null>;
  listeners: WeakMap<
    EventListenerOrEventListenerObject,
    RemoteEventListenerRecord
  >;
} {
  if (element[REMOTE_EVENTS]) return element[REMOTE_EVENTS]!;

  const remoteEvents = {
    events: new Map(),
    properties: new Map(),
    listeners: new WeakMap(),
  };

  Object.defineProperty(element, REMOTE_EVENTS, {
    value: remoteEvents,
    enumerable: false,
  });

  return remoteEvents;
}

function getRemoteEventRecord(
  this: RemoteElement<any, any, any, any>,
  type: string,
  {property, definition}: Pick<RemoteEventRecord, 'property' | 'definition'>,
) {
  const remoteEvents = getRemoteEvents(this);

  let remoteEvent = remoteEvents.events.get(type);
  if (remoteEvent == null) {
    remoteEvent = {
      name: type,
      property,
      definition,
      listeners: new Set(),
      dispatch: (arg: any) => {
        const event =
          definition?.dispatchEvent?.call(this, arg) ??
          new RemoteEvent(type, {
            detail: arg,
            bubbles: definition?.bubbles,
          });

        this.dispatchEvent(event);

        return (event as any).response;
      },
    };

    remoteEvents.events.set(type, remoteEvent);
  }

  return remoteEvent;
}

function removeRemoteListener(
  this: RemoteElement<any, any, any, any>,
  type: string,
  listener: EventListenerOrEventListenerObject,
  listenerRecord: RemoteEventListenerRecord,
) {
  const remoteEvents = getRemoteEvents(this);

  const remoteEvent = listenerRecord[1];
  remoteEvent.listeners.delete(listener);
  remoteEvents.listeners.delete(listener);

  if (remoteEvent.listeners.size > 0) return;

  remoteEvents.events.delete(type);

  if (remoteEvent.property) {
    if (
      getRemoteProperties(this)?.[remoteEvent.property] === remoteEvent.dispatch
    ) {
      updateRemoteElementProperty(this, remoteEvent.property, undefined);
    }
  } else {
    if (getRemoteEventListeners(this)?.[type] === remoteEvent.dispatch) {
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

function noopBubblesEventListener() {}
