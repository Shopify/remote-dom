import {
  createRemoteElement,
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

customElements.define('remote-root', RemoteRootElement);
customElements.define('remote-fragment', RemoteFragmentElement);

declare global {
  interface HTMLElementTagNameMap {
    'remote-root': InstanceType<typeof RemoteRootElement>;
    'remote-fragment': InstanceType<typeof RemoteFragmentElement>;
  }
}

export const Text = createRemoteElement<TextProperties>({
  properties: {
    emphasis: {type: Boolean},
  },
});

export const Button = createRemoteElement<ButtonProperties, {}, {modal?: true}>(
  {
    properties: {
      onPress: {event: true},
    },
    slots: ['modal'],
  },
);

export const Modal = createRemoteElement<
  ModalProperties,
  ModalMethods,
  {primaryAction?: true}
>({
  properties: {
    onClose: {event: true},
  },
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
