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

// monkeypatch RemoteElement to remove all custom event handling
// so it just uses the standard EventTarget implementation.
const EVENT_HANDLER_PROPERTIES = Symbol('EVENT_HANDLER_PROPERTIES');
function strip(Ctor: any) {
  const remoteElementProto = Object.getPrototypeOf(Ctor).prototype;
  delete remoteElementProto.addEventListener;
  delete remoteElementProto.removeEventListener;
  delete remoteElementProto.dispatchEvent;
  Ctor.remotePropertyDefinitions.forEach((value, key) => {
    if (key.startsWith('_on')) {
      Ctor.remotePropertyDefinitions.delete(key);
    } else if (value.event) {
      // we should probably just implement this in the React wrapper
      const isReactStyle = key !== 'on' + value.event;
      const proxyHandler = function (
        this: Element & {[EVENT_HANDLER_PROPERTIES]: Record<string, Function>},
        event: Event,
      ) {
        const handlers = this[EVENT_HANDLER_PROPERTIES];
        if (isReactStyle) return handlers?.[key]?.(event.detail, event);
        return handlers?.[key]?.(event);
      };

      // remove the funky event handler behavior, but don't delete
      // the "remote property definition" because the Preact+React
      // wrapper code currently relies on it (it should probably
      // just forward props by default instead!)
      value.alias = undefined;
      // install a standard event handler property
      const type = value.event;
      Object.defineProperty(Ctor.prototype, key, {
        configurable: true,
        enumerable: true,
        get() {
          return this[EVENT_HANDLER_PROPERTIES]?.[key] ?? null;
        },
        set(value) {
          let handlers = this[EVENT_HANDLER_PROPERTIES];
          if (!handlers) this[EVENT_HANDLER_PROPERTIES] = handlers = {};
          const prev = handlers[key];
          handlers[key] = value;
          if (value && !prev) {
            this.addEventListener(type, proxyHandler);
          } else if (!value && prev) {
            this.removeEventListener(type, proxyHandler);
          }
        },
      });
    }
  });
}
strip(Text);
strip(Button);
strip(Stack);
strip(Modal);
