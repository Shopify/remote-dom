# Component design

remote-ui provides a very simple component model; the main focus is the [`RemoteComponent`](../packages/core#remotecomponent), which have just a `type`, `props` (properties), and `children`. This model was heavily inspired by React and the DOM, and so good “component design” (what types exist, what properties exist on each type, and what it does with children) is generally pretty similar in remote-ui.

However, remote-ui has one important feature that can impact some component APIs: components can’t have synchronous function properties. As noted in the [`@remote-ui/rpc` documentation](../packages/rpc), in order to make function passing between the remote and host contexts work, all functions become asynchronous (implemented via message passing). This means that some APIs you might naturally design if you are familiar with React are not possible in remote-ui:

- You can’t pass DOM events to the remote context in a way that allows them to call methods like `preventDefault()` or `stopPropagation()`. You also generally want to avoid passing deep, complex objects to the remote context, since there is a serialization cost. There are many options for allowing the remote context to still specify behavior for events; for example, here is a form component that offers a prop to configure the way the `submit` event will be handled on the host:

  ```ts
  import {createRemoteComponent} from '@remote-ui/core';

  interface Props {
    /**
     * Whether to prevent the default submit behavior of the native form.
     */
    preventDefault?: boolean;
    /**
     * Called when the form is submitted for any reason. You must store the state
     * of fields locally, as none of the form values are provided to this callback.
     */
    onSubmit(): void;
  }

  export const Form = createRemoteComponent<'Form', Props>('Form');
  ```

- You can’t pass JSX or remote components as props to other remote components. This mistake is particularly common if you are coming from React, where you are probably familiar with APIs like `<Suspense fallback={<div>Loading...</div>} />`. While the following looks like it should work:

  ```tsx
  import type {ReactNode} from 'react';
  import {createRemoteReactComponent} from '@remote-ui/react';

  interface Button {
    icon?: ReactNode;
  }

  const Button = createRemoteReactComponent<'Button', Props>('Button');
  const Icon = createRemoteReactComponent('Icon');

  return <Button icon={<Icon />}>Press me!</Button>;
  ```

  It will not do what you expect. This tells remote-ui that there is a `Button` component with an `icon` prop, but remote-ui will just see that prop as an object (the result of transpiling away the JSX to `_jsx_(Icon)`), and has no way of assigning that prop the special meaning of it actually being part of the tree, in another location.

  A similar example using the base remote-ui API also does not work:

  ```tsx
  import {
    createRemoteRoot,
    createRemoteComponent,
    RemoteComponent,
  } from '@remote-ui/core';

  interface Button {
    icon?: RemoteComponent<any, any>;
  }

  const Button = createRemoteReactComponent<'Button', Props>('Button');
  const Icon = createRemoteReactComponent('Icon');

  const root = createRemoteRoot(() => {});
  const button = root.createComponent(Button, {
    icon: root.createComponent(Icon),
  });
  root.appendChild(button);
  root.mount();
  ```

  In this case, remote-ui will once again see the `icon` prop, but it will simply send it over as it would any other object; that object will not have any special connection to the remote tree that will keep it updated if you were to change any of its props.

  It’s important to understand that these restrictions are not really any different than working with the DOM directly, which is one of the largest inspirations for the API of remote-ui. In the DOM, though the following code is entirely valid, it doesn’t really _do_ anything.

  ```ts
  const button = document.createElement('button');
  button.icon = document.createElement('i');
  ```

  The only special relationship DOM nodes have with one another is through their relationships in the tree — siblings, parents, children, etc. This is the same for components in remote-ui — if you want them to have a special connection, you can only do so through appending children, not through arbitrary props.

- You can’t pass [“render props”](https://reactjs.org/docs/render-props.html), where a function returns some markup. Part of this is related to the point above, since “getting markup” does not create the connection remote-ui needs to manage the tree as it changes. Additionally, though, all functions passed as props with remote-ui return promises, which generally makes them ill-suited to rendering UI on the fly.

Other APIs you might consider are possible, but are made anti-patterns by the asynchronous nature of events and UI updates in remote-ui:

- You should avoid [“controlled” component APIs](https://reactjs.org/docs/forms.html#controlled-components) in remote components that manage _continuous_ input, like text inputs or color pickers. “Controlled” inputs are ones where the value of an input is managed by the remote context, typically updated as the result of a callback (e.g., `value` and `onChange`). Nothing prevents you from using this API, but the few additional milliseconds of delay introduced by serializing events and UI updates across a `postMessage` interface in remote-ui can cause visual jank, especially on lower-power devices.

  Instead of controlled components, we recommend relying on either uncontrolled inputs (where the remote component does not control the value at all, and instead receives the value from the host directly at a useful time, like `onSubmit`), or on “partially controlled” inputs. In this pattern, the remote component still manages the value, but it leaves it to the host version of the component to manage state while the input is interacted with, calling back with the value once it is actually “committed” by the user. At that point, the remote component can update its state, which should result in no additional update being needed on the host. The following component definition shows an API you could use for a text field component that follows this “partially controlled” pattern:

  ```ts
  import {createRemoteComponent} from '@remote-ui/core';

  interface Props {
    /**
     * The most recently committed value.
     */
    value?: string;
    /**
     * Called when the value is committed by the user. This happens when the user
     * blurs the field, or submits a containing form by pressing the `enter` key.
     * You should store the committed value received by this function and reflect
     * it back in the `value` prop.
     */
    onChange(value: string): void;
    /**
     * Called every time the user changes the value in the input. You can use this
     * to detect when the user has started interacting with a field, which can be
     * useful for things like clearing existing validation errors on the field. Do
     * **not** use this callback to maintain the state of the input locally — rely
     * on the committed value received by `onChange()` instead.
     */
    onInput?(value: string): void;
  }

  export const TextField = createRemoteComponent<'TextField', Props>(
    'TextField',
  );
  ```
