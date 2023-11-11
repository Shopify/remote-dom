import {createElement, isValidElement} from 'preact';
import type {
  RemoteElement,
  RemoteElementConstructor,
  RemotePropertiesFromElementConstructor,
  RemoteSlotsFromElementConstructor,
} from '@remote-dom/core/elements';

import type {
  RemoteComponentType,
  RemoteComponentTypeFromElementConstructor,
} from './types.ts';

export function createRemoteComponent<
  Tag extends keyof HTMLElementTagNameMap,
  ElementConstructor extends RemoteElementConstructor<
    any,
    any
  > = HTMLElementTagNameMap[Tag] extends RemoteElement<
    infer Properties,
    infer Slots
  >
    ? RemoteElementConstructor<Properties, Slots>
    : never,
>(
  tag: Tag,
  Element: ElementConstructor | undefined = customElements.get(tag) as any,
): RemoteComponentType<
  RemotePropertiesFromElementConstructor<ElementConstructor>,
  RemoteSlotsFromElementConstructor<ElementConstructor>
> {
  const RemoteComponent: RemoteComponentTypeFromElementConstructor<ElementConstructor> =
    function RemoteComponent(props) {
      const updatedProps: Record<string, any> = {};
      const children = toChildren(props.children);

      for (const prop in props) {
        const propValue = props[prop];

        if (prop === 'slot') {
          updatedProps.slot = propValue;
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

        // Preact assumes any properties starting with `on` are event listeners.
        // If we are in this situation, we try to use one of the property’s aliases,
        // which should be a name *not* starting with `on`.
        const definition = Element.remotePropertyDefinitions.get(prop);
        if (definition == null) continue;
        const aliasTo =
          definition.type === Function && definition.name.startsWith('on')
            ? definition.alias?.[0]
            : undefined;
        updatedProps[aliasTo ?? prop] = propValue;
      }

      return createElement(tag, updatedProps, ...children);
    };

  RemoteComponent.displayName = `RemoteComponent(${tag})`;

  return RemoteComponent;
}

// Simple version of React.Children.toArray()
function toChildren(value: any) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  return [value];
}
