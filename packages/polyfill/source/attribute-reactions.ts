import type {NamespaceURI} from './constants.ts';
import type {Element} from './Element.ts';
import {enqueueCustomElementReaction} from './custom-element-reactions.ts';

export function enqueueAttributeReaction(
  element: Element,
  localName: string,
  oldValue: string | null,
  newValue: string | null,
  namespace: NamespaceURI,
) {
  const {observedAttributes} = element.constructor as typeof Element;
  const {attributeChangedCallback} = element;

  if (
    attributeChangedCallback == null ||
    observedAttributes == null ||
    !observedAttributes.includes(localName)
  ) {
    return;
  }

  enqueueCustomElementReaction(() =>
    attributeChangedCallback.call(
      element,
      localName,
      oldValue,
      newValue,
      namespace,
    ),
  );
}
