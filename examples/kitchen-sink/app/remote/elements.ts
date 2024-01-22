import {
  createRemoteElement,
  RemoteRootElement,
  RemoteFragmentElement,
} from '@remote-dom/core/elements';

import type {
  ButtonProperties,
  StackProperties,
  TextFieldProperties,
} from '../types.ts';

customElements.define('remote-root', RemoteRootElement);
customElements.define('remote-fragment', RemoteFragmentElement);

declare global {
  interface HTMLElementTagNameMap {
    'remote-root': InstanceType<typeof RemoteRootElement>;
    'remote-fragment': InstanceType<typeof RemoteFragmentElement>;
  }
}

export const Button = createRemoteElement<ButtonProperties>({
  properties: {
    onPress: {event: true},
  },
});

export const Stack = createRemoteElement<StackProperties>({
  properties: {
    spacing: {type: Boolean},
  },
});

export const TextField = createRemoteElement<TextFieldProperties>({
  properties: {
    label: {type: String},
    onChange: {event: true},
  },
});

customElements.define('ui-button', Button);
customElements.define('ui-stack', Stack);
customElements.define('ui-text-field', TextField);

declare global {
  interface HTMLElementTagNameMap {
    'ui-button': InstanceType<typeof Button>;
    'ui-stack': InstanceType<typeof Stack>;
    'ui-text-field': InstanceType<typeof TextField>;
  }
}
