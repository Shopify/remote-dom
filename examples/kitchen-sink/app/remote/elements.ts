import {
  createRemoteElement,
  RemoteEvent,
  RemoteRootElement,
  RemoteFragmentElement,
} from '@remote-dom/core/elements';

import type {
  TextProperties,
  ButtonProperties,
  ModalProperties,
  ModalMethods,
  StackProperties,
} from '../types.ts';

// In this file we will define the custom elements that can be rendered in the
// remote environment. Note that none of these elements have any real implementation —
// they just act as placeholders that will be communicated to the host environment.
// The host environment contains the actual implementation of these elements (in this case,
// they have been implemented using Preact, in the `host/components.tsx` file).

export const Text = createRemoteElement<TextProperties>({
  properties: {
    emphasis: {type: Boolean},
  },
});

export const Button = createRemoteElement<
  ButtonProperties,
  {},
  {modal?: true},
  {press(event: RemoteEvent): void}
>({
  attributes: ['variant'],
  // events: ['press'],
  events: {
    press: {
      dispatchEvent(detail: any) {
        console.log('[Button] dispatchEvent called with:', detail);
        return new RemoteEvent('press', {detail});
      },
    },
  },
  slots: ['modal'],
});

// export class Button extends RemoteElement<ButtonProperties> {
//   static tagName = 's-button';

//   static get remoteAttributes() {
//     return ['variant'];
//   }

//   static get remoteEvents() {
//     return {
//       press: {
//         bubbles: true,
//         dispatchEvent(detail: any) {
//           return new RemoteEvent('press', {bubbles: true, detail});
//         },
//       },
//     };
//   }

//   constructor() {
//     super();
//   }
// }

export const Modal = createRemoteElement<
  ModalProperties,
  ModalMethods,
  {primaryAction?: true},
  {open(event: RemoteEvent): void; close(event: RemoteEvent): void}
>({
  events: ['close'],
  slots: ['primaryAction'],
  methods: ['open', 'close'],
});

export const Stack = createRemoteElement<StackProperties>({
  properties: {
    spacing: {type: Boolean},
  },
});

customElements.define('ui-text', Text);
customElements.define('ui-button', Button);
customElements.define('ui-modal', Modal);
customElements.define('ui-stack', Stack);

declare global {
  interface HTMLElementTagNameMap {
    'ui-text': InstanceType<typeof Text>;
    'ui-button': InstanceType<typeof Button>;
    'ui-stack': InstanceType<typeof Stack>;
    'ui-modal': InstanceType<typeof Modal>;
  }
}

// We use the Remote DOM `RemoteRootElement` class as the `<remote-root>` element.
// This element provides a convenient `connect()` method that starts synchronizing
// its children over a `RemoteConnection`, which we will use in the worker sandbox.
customElements.define('remote-root', RemoteRootElement);

// We use the Remote DOM `RemoteFragmentElement` class as the `<remote-fragment>` element.
// This element is used by the Preact and React helper libraries, in order to allow
// React elements passed as props to be automatically converted into the `slot`-ted elements
// that the Remote DOM library expects.
customElements.define('remote-fragment', RemoteFragmentElement);

declare global {
  interface HTMLElementTagNameMap {
    'remote-root': InstanceType<typeof RemoteRootElement>;
    'remote-fragment': InstanceType<typeof RemoteFragmentElement>;
  }
}
