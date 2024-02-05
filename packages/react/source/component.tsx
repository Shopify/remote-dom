import {
  useRef,
  useLayoutEffect,
  createElement,
  forwardRef,
  isValidElement,
  cloneElement,
} from 'react';
import type {
  RemoteElement,
  RemoteElementConstructor,
} from '@remote-dom/core/elements';

import type {
  RemoteComponentTypeFromElementConstructor,
  RemoteComponentPropsFromElementConstructor,
} from './types.ts';

export interface RemoteComponentOptions {
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
    any
  > = HTMLElementTagNameMap[Tag] extends RemoteElement<
    infer Properties,
    infer Methods,
    infer Slots
  >
    ? RemoteElementConstructor<Properties, Methods, Slots>
    : never,
>(
  tag: Tag,
  Element: ElementConstructor | undefined = customElements.get(tag) as any,
  {slotProps = true}: RemoteComponentOptions = {},
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
      const internalRef = useRef<any>();
      const lastRemotePropertiesRef = useRef<Record<string, any>>();

      const remoteProperties: Record<string, any> = {};
      const children = toChildren(props.children);

      for (const prop in props) {
        const propValue = props[prop];

        if (prop === 'slot') {
          remoteProperties.slot = propValue;
          continue;
        }

        if (normalizeSlotProps) {
          if (
            Element.remoteSlotDefinitions.has(prop) &&
            isValidElement(propValue)
          ) {
            if (!slotPropWrapper) {
              children.push(cloneElement(propValue as any, {slot: prop}));
            } else {
              children.push(
                createElement(slotPropWrapper, {slot: prop}, propValue),
              );
            }
            continue;
          }
        }

        const definition = Element.remotePropertyDefinitions.get(prop);

        if (definition) {
          remoteProperties[prop] = propValue;
        }
      }

      useLayoutEffect(() => {
        if (internalRef.current == null) return;

        const propsToUpdate =
          lastRemotePropertiesRef.current ?? remoteProperties;

        for (const prop in propsToUpdate) {
          internalRef.current[prop] = remoteProperties[prop];
        }

        lastRemotePropertiesRef.current = remoteProperties;
      });

      return createElement(
        tag,
        {
          ref: (refValue: any) => {
            internalRef.current = refValue;
            if (typeof ref === 'function') ref(refValue);
            else if (ref != null) ref.current = refValue;
          },
        },
        ...children,
      );
    });

  RemoteComponent.displayName = `RemoteComponent(${tag})`;

  return RemoteComponent;
}

// Simple version of React.Children.toArray()
function toChildren(value: any) {
  if (value == null) return [];
  if (Array.isArray(value)) return [...value];
  return [value];
}
