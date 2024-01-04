import {REMOTE_PROPERTIES} from '../constants.ts';
import {RemoteEvent} from './RemoteEvent.ts';
import {
  updateRemoteElementProperty,
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

interface RemoteElementSlotNormalizedDefinition {}

export type RemoteElementSlotsDefinition<
  Slots extends Record<string, any> = {},
> = {
  [Slot in keyof Slots]: RemoteElementSlotDefinition;
};

export type RemotePropertiesFromElementConstructor<T> = T extends {
  new (): RemoteElement<infer Properties, any, any>;
}
  ? Properties
  : never;

export type RemoteSlotsFromElementConstructor<T> = T extends {
  new (): RemoteElement<any, infer Slots, any>;
}
  ? Slots
  : never;

export type RemoteMethodsFromElementConstructor<T> = T extends {
  new (): RemoteElement<any, any, infer Methods>;
}
  ? Methods
  : never;

export type RemoteElementConstructor<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
  Methods extends Record<string, (...args: any[]) => any> = {},
> = {
  new (): RemoteElement<Properties, Slots, Methods> & Properties & Methods;
  readonly remoteSlots?:
    | RemoteElementSlotsDefinition<Slots>
    | readonly (keyof Slots)[];
  readonly remoteSlotDefinitions: Map<
    string,
    RemoteElementSlotNormalizedDefinition
  >;
  readonly remoteProperties?:
    | RemoteElementPropertiesDefinition<Properties>
    | readonly (keyof Properties)[];
  readonly remotePropertyDefinitions: Map<
    string,
    RemoteElementPropertyNormalizedDefinition
  >;
  createProperty<Value = unknown>(
    name: string,
    definition?: RemoteElementPropertyDefinition<Value>,
  ): void;
};

export interface RemoteElementCreatorOptions<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
  Methods extends Record<string, (...args: any[]) => any> = {},
> {
  slots?: RemoteElementConstructor<Properties, Slots, Methods>['remoteSlots'];
  properties?: RemoteElementConstructor<
    Properties,
    Slots,
    Methods
  >['remoteProperties'];
  methods?: Methods | keyof Methods[];
}

export function createRemoteElement<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
  Methods extends Record<string, (...args: any[]) => any> = {},
>({
  slots,
  properties,
  methods,
}: RemoteElementCreatorOptions<
  Properties,
  Slots,
  Methods
> = {}): RemoteElementConstructor<Properties, Slots, Methods> {
  const RemoteElementConstructor = class extends RemoteElement<
    Properties,
    Slots
  > {
    static readonly remoteSlots = slots;
    static readonly remoteProperties = properties;
  } as any;

  if (methods != null) {
    if (Array.isArray(methods)) {
      for (const method of methods) {
        RemoteElementConstructor.prototype[method] = function (...args: any[]) {
          return callRemoteElementMethod(this, method, ...args);
        };
      }
    } else {
      Object.assign(RemoteElementConstructor.prototype, methods);
    }
  }

  return RemoteElementConstructor;
}

const SLOT_PROPERTY = 'slot';
const REMOTE_EVENTS = Symbol('remote.events');

interface RemoteEventRecord {
  readonly name: string;
  readonly property: string;
  readonly listeners: Set<EventListenerOrEventListenerObject>;
  dispatch(...args: any[]): unknown;
}

type RemoteEventListenerRecord = [
  EventListenerOrEventListenerObject,
  RemoteEventRecord,
];

// Heavily inspired by https://github.com/lit/lit/blob/343187b1acbbdb02ce8d01fa0a0d326870419763/packages/reactive-element/src/reactive-element.ts
export abstract class RemoteElement<
  Properties extends Record<string, any> = {},
  Slots extends Record<string, any> = {},
  Methods extends Record<string, (...args: any[]) => any> = {},
> extends HTMLElement {
  static readonly slottable = true;

  static readonly remoteSlots?: any;
  static readonly remoteProperties?: any;
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

  static get remoteSlotDefinitions(): Map<
    string,
    RemoteElementSlotNormalizedDefinition
  > {
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
  private static readonly __remoteSlotDefinitions = new Map<
    string,
    RemoteElementSlotNormalizedDefinition
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
    const {remoteSlots, remoteProperties} = this;

    // finalize any superclasses
    const SuperConstructor = Object.getPrototypeOf(
      this,
    ) as typeof RemoteElement;

    const observedAttributes: string[] = [];
    const attributeToPropertyMap = new Map<string, string>();
    const eventToPropertyMap = new Map<string, string>();
    const remoteSlotDefinitions = new Map<
      string,
      RemoteElementSlotNormalizedDefinition
    >();
    const remotePropertyDefinitions = new Map<
      string,
      RemoteElementPropertyNormalizedDefinition
    >();

    if (typeof SuperConstructor.finalize === 'function') {
      SuperConstructor.finalize();
      observedAttributes.push(...SuperConstructor.observedAttributes);
      SuperConstructor.remotePropertyDefinitions.forEach(
        (definition, property) => {
          remotePropertyDefinitions.set(property, definition);
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
        remoteSlotDefinitions.set(slotName, {});
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

    Object.defineProperties(this, {
      __observedAttributes: {
        value: observedAttributes,
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

    updateRemoteElementProperty(this, SLOT_PROPERTY, this.slot);
  }

  // Just need to use these types so TS doesn’t lose track of them.
  /** @internal */
  __slots?: Slots;

  /** @internal */
  __properties?: Properties;

  /** @internal */
  __methods?: Methods;

  private [REMOTE_PROPERTIES]!: Properties;
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

  attributeChangedCallback(key: string, _oldValue: any, newValue: any) {
    const {
      remotePropertyDefinitions,
      __attributeToPropertyMap: attributeToPropertyMap,
    } = this.constructor as typeof RemoteElement;

    const property = attributeToPropertyMap.get(key);

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
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    const {__eventToPropertyMap: eventToPropertyMap} = this
      .constructor as typeof RemoteElement;
    const property = eventToPropertyMap.get(type);

    if (property == null) {
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
        listeners: new Set(),
        dispatch: (...args: any[]) => {
          const event = new RemoteEvent(type, {
            detail: args.length > 1 ? args : args[0],
          });

          const ranWithoutPrevention = this.dispatchEvent(event);

          return event.resolved ? event.result : ranWithoutPrevention;
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

    const currentPropertyValue = this[REMOTE_PROPERTIES][property];

    if (currentPropertyValue != null) return;

    updateRemoteElementProperty(this, property!, remoteEvent.dispatch);
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

  if (this[REMOTE_PROPERTIES][remoteEvent.property] === remoteEvent.dispatch) {
    updateRemoteElementProperty(this, remoteEvent.property, undefined);
  }
}

// function convertPropertyValueToAttribute<Value = unknown>(
//   value: Value,
//   type: RemoteElementPropertyTypeOrBuiltIn<Value>,
// ) {
//   switch (type) {
//     case Boolean:
//       return value ? '' : null;
//     case Object:
//     case Array:
//       return value == null ? value : JSON.stringify(value);
//     case String:
//     case Number:
//       return value == null ? value : String(value);
//     case Function:
//       return null;
//     default: {
//       return (
//         (type as RemoteElementPropertyType<Value>).serialize?.(value) ?? null
//       );
//     }
//   }
// }

function saveRemoteProperty<Value = unknown>(
  name: string,
  description: RemoteElementPropertyDefinition<Value> | undefined,
  observedAttributes: string[],
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
    observedAttributes.push(attributeName);
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
