/**
 * The details for a single attribute that will be defined on a `RemoteElement`.
 */
export interface RemoteElementAttributeDefinition {}

/**
 * The details for a single event listener that will be defined on a `RemoteElement`.
 */
export interface RemoteElementEventListenerDefinition {
  bubbles?: boolean;
  property?: boolean | string;
  dispatchEvent?(this: Element, ...args: any[]): Event | undefined | void;
}

/**
 * Configuration for event listeners that will be synchronized between a remote
 * element and its host representation.
 */
export type RemoteElementEventListenersDefinition<
  EventListeners extends Record<string, any> = {},
> = {
  [Event in keyof EventListeners]: RemoteElementEventListenerDefinition;
};

/**
 * The details for a single method that will be defined on a `RemoteElement`.
 */
export interface RemoteElementMethodDefinition {}

/**
 * Configuration for methods that will be synchronized between a remote element
 * and its host representation.
 */
export type RemoteElementMethodsDefinition<
  Slots extends Record<string, any> = {},
> = {
  [Slot in keyof Slots]: RemoteElementMethodDefinition;
};

/**
 * The details for a single property that will be defined on a `RemoteElement`.
 */
export interface RemoteElementPropertyDefinition<Value = unknown> {
  /**
   * The type of the property, which will control how it is reflected to and
   * from an attribute. Defaults to assuming the property contains a string value.
   */
  type?: RemoteElementPropertyTypeOrBuiltIn<Value>;

  /**
   * A list of aliases for this property. When the property is set, the aliases
   * will be defined as dedicated properties, but will always read and write to the
   * same underlying value.
   *
   * @deprecated
   */
  alias?: string[];

  /**
   * Whether the property should be settable using `addEventListener()`. When set to
   * `true`, Remote DOM infers the name of the event from the property name. When set
   * to a string, Remote DOM uses the string as the event name. When set to anything
   * else, there will be no connection between the property and event listener.
   *
   * @deprecated Use `RemoteElement.eventListeners` instead.
   */
  event?: boolean | string;

  /**
   * The attribute to reflect this property to. The value of the property will be serialized
   * according to the logic you provide with the `type` field. If set to `true` or omitted, an
   * attribute will be maintained with same name as the property. You can also set this option to
   * a string to provide a custom attribute name. If you want to disable attribute reflection
   * altogether, set this option to `false`.
   */
  attribute?: string | boolean;

  /**
   * The default value for the property. This value will be communicated to the host as if the
   * property was set directly.
   */
  default?: Value;
}

/**
 * Configuration for properties that will be synchronized between a remote
 * element and its host representation.
 */
export type RemoteElementPropertiesDefinition<
  Properties extends Record<string, any> = {},
> = {
  [Property in keyof Properties]: RemoteElementPropertyDefinition<
    Properties[Property]
  >;
};

/**
 * An object that can be used to define the type of a property on a remote
 * element, which will control its attribute reflection behavior.
 */
export type RemoteElementPropertyTypeOrBuiltIn<Value = unknown> =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Object
  | typeof Array
  | typeof Function
  | RemoteElementPropertyType<Value>;

/**
 * An object that provides custom logic for parsing a property from its
 * matching attribute value, and that can serialize the property back to
 * a string for the attribute.
 */
export interface RemoteElementPropertyType<Value = unknown> {
  parse?(value: string | unknown): Value;
  serialize?(value: Value): string | unknown;
}

/**
 * The details for a single slot that can be filled on a `RemoteElement`.
 */
export interface RemoteElementSlotDefinition {}

/**
 * Configuration for slots that will be synchronized between a remote element
 * and its host representation.
 */
export type RemoteElementSlotsDefinition<
  Slots extends Record<string, any> = {},
> = {
  [Slot in keyof Slots]: RemoteElementSlotDefinition;
};
