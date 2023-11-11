import {
  createRemoteElement,
  RemoteRootElement,
  RemoteFragmentElement,
} from '@remote-dom/core/elements';

customElements.define('remote-root', RemoteRootElement);
customElements.define('remote-fragment', RemoteFragmentElement);

declare global {
  interface HTMLElementTagNameMap {
    'remote-root': InstanceType<typeof RemoteRootElement>;
    'remote-fragment': InstanceType<typeof RemoteFragmentElement>;
  }
}

const Button = createRemoteElement<{onPress?(): void}>({
  properties: {
    onPress: {event: true},
  },
});

const Stack = createRemoteElement<{spacing?: boolean}>({
  properties: {
    spacing: {type: Boolean},
  },
});

const TextField = createRemoteElement<{
  label?: string;
  onChange?(value: string): void;
}>({
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
