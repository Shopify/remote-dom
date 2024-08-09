import {createElement, isValidElement, cloneElement} from 'preact';
import {forwardRef} from 'preact/compat';
import type {
  RemoteElement,
  RemoteElementConstructor,
  RemoteEventListenersFromElementConstructor,
} from '@remote-dom/core/elements';

import type {
  RemoteComponentPropsFromElementConstructor,
  RemoteComponentTypeFromElementConstructor,
} from './types.ts';

export interface RemoteComponentOptions<
  Constructor extends RemoteElementConstructor<
    any,
    any,
    any,
    any
  > = RemoteElementConstructor<any, any, any, any>,
  Props extends Record<string, any> = Record<string, any>,
> {
  /**
   * Customize how Preact props are mapped to slotted child elements. By default,
   * any prop that is listed in the remote element’s class definition, and which
   * contains a valid Preact element, is turned into a `<remote-fragment>` element
   * with a `slot` attribute set to the name of the prop. You disable this behavior
   * entirely by setting this option to `false`, or customize the tag name of the
   * wrapper element by passing the `wrapper` option.
   *
   * @default true
   */
  slotProps?:
    | boolean
    | {
        /**
         * Customizes the wrapper element used on a slotted element. If `true` or omitted,
         * the wrapper element will be a `<remote-fragment>` element. If `false`, the Preact
         * element will be cloned with a `slot` prop. If a string, that wrapper element will
         * be created.
         *
         * @default 'remote-fragment'
         */
        wrapper?: boolean | string;
      };

  /**
   * Customizes the props your wrapper React component will have for event listeners
   * on the underlying custom element. The key is the prop name on the React component,
   * and the value is an options object containing the event name on the custom element.
   *
   * @example
   * ```tsx
   * const Button = createRemoteComponent('ui-button', ButtonElement, {
   *   eventProps: {
   *     onClick: {event: 'click'},
   *   },
   * });
   * ```
   */
  eventProps?: Record<
    keyof Props,
    {
      event: keyof RemoteEventListenersFromElementConstructor<Constructor>;
    }
  >;
}

/**
 * Creates a Preact component that renders a remote DOM element. This component will pass
 * through all the props from the Preact component to the remote DOM element, and will
 * convert any props that are Preact elements into a `remote-fragment` element with a `slot`
 * attribute that matches the prop name.
 *
 * @param tag The name of the remote DOM element to render
 * @param Element The constructor for the remote DOM element to render. If not provided,
 * the constructor will be looked up using `customElements.get(tag)`.
 */
export function createRemoteComponent<
  Tag extends keyof HTMLElementTagNameMap,
  ElementConstructor extends RemoteElementConstructor<
    any,
    any,
    any,
    any
  > = HTMLElementTagNameMap[Tag] extends RemoteElement<
    infer Properties,
    infer Methods,
    infer Slots,
    infer EventListeners
  >
    ? RemoteElementConstructor<Properties, Methods, Slots, EventListeners>
    : never,
  Props extends Record<string, any> = {},
>(
  tag: Tag,
  Element: ElementConstructor | undefined = customElements.get(tag) as any,
  {
    slotProps = true,
    eventProps = {} as any,
  }: RemoteComponentOptions<ElementConstructor, Props> = {},
): RemoteComponentTypeFromElementConstructor<ElementConstructor> {
  const normalizeSlotProps = Boolean(slotProps);
  const slotPropWrapperOption =
    (typeof slotProps === 'object' ? slotProps.wrapper : undefined) ?? true;
  const slotPropWrapper =
    typeof slotPropWrapperOption === 'string'
      ? slotPropWrapperOption
      : slotPropWrapperOption
        ? 'remote-fragment'
        : false;

  // @ts-expect-error I can’t make the types work :/
  const RemoteComponent: RemoteComponentTypeFromElementConstructor<ElementConstructor> =
    forwardRef<
      InstanceType<ElementConstructor>,
      RemoteComponentPropsFromElementConstructor<ElementConstructor>
    >(function RemoteComponent(props, ref) {
      const updatedProps: Record<string, any> = {ref};
      const children = toChildren(props.children);

      for (const prop in props) {
        const propValue = props[prop];

        if (prop === 'slot') {
          updatedProps.slot = propValue;
          continue;
        }

        if (
          normalizeSlotProps &&
          Element.remoteSlotDefinitions.has(prop) &&
          isValidElement(propValue)
        ) {
          if (!slotPropWrapper) {
            children.push(cloneElement(propValue, {slot: prop}));
          } else {
            children.push(
              createElement(slotPropWrapper, {slot: prop}, propValue),
            );
          }

          continue;
        }

        const eventProp = eventProps[prop];
        if (eventProp) {
          const {event} = eventProp;

          updatedProps[`on${event as string}`] = propValue;
          continue;
        }

        updatedProps[prop] = propValue;
      }

      return createElement(tag, updatedProps, ...children);
    });

  RemoteComponent.displayName = `RemoteComponent(${tag})`;

  return RemoteComponent;
}

// Simple version of React.Children.toArray()
function toChildren(value: any) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
