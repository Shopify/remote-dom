import {
  useRef,
  useLayoutEffect,
  createElement,
  forwardRef,
  isValidElement,
} from 'react';
import type {
  RemoteElement,
  RemoteElementConstructor,
} from '@remote-dom/core/elements';

import type {
  RemoteComponentTypeFromElementConstructor,
  RemoteComponentPropsFromElementConstructor,
} from './types.ts';

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
): RemoteComponentTypeFromElementConstructor<ElementConstructor> {
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

        if (
          Element.remoteSlotDefinitions.has(prop) &&
          isValidElement(propValue)
        ) {
          children.push(
            createElement('remote-fragment', {slot: prop}, propValue),
          );
          continue;
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
