# `@remote-ui/testing`

This library provides a unit testing framework for code that uses `@remote-ui/core`. Its API is heavily inspired by the Shopify’s [React testing library](https://github.com/Shopify/quilt/tree/master/packages/react-testing).

## Installation

Using `yarn`:

```
yarn add @remote-ui/testing --dev
```

or, using `npm`:

```
npm install @remote-ui/testing --save-dev
```

## Usage

This library exports a `mount` function. The first argument to this function is a function, in which you can perform any number of operations on a [`@remote-ui/core` `RemoteRoot` object](../core#remoteroot):

```tsx
import {mount} from '@remote-ui/testing';

const tree = mount((root) => {
  const button = root.createComponent('Button');
  button.append('Submit');
  root.append(button);
});
```

This function is called with a "noop" `RemoteRoot` object by default, but you may provide your own `RemoteRoot` object instead by passing it as the second argument:

```tsx
import {createRemoteRoot} from '@remote-ui/core';
import {mount} from '@remote-ui/testing';

const myRoot = createRemoteRoot(() => {
  /* handle updates */
});

const tree = mount((root) => {
  const button = root.createComponent('Button', {
    onPress: () => 'Paid!',
  });
  button.append('Submit');
  root.append(button);
}, myRoot);
```

The value returned from this function reflects the state of the remote-ui root after the operations have been performed. This object exposes a rich API for traversing the resulting tree: it includes all the same operations as a [`@shopify/react-testing` `RemoteRoot`](https://github.com/Shopify/quilt/tree/master/packages/react-testing#root), with the exception of any DOM-related properties (which don’t make sense, since there’s no DOM anywhere in sight!).

```tsx
const tree = mount(() => {
  /* ... */
});

const buttonProps = tree.find('Button').props;
const buttonText = tree.find('Button').text;
const allByText = tree.findAllWhere((element) => /submit/.test(element.text));
const descendantButtons = tree.children.findAll('Button');
```

This object also has a few important methods for simulating changes in the tree, and updating the "snapshot" of that tree in order to make assertions. Most notable, calling the [`trigger()`](https://github.com/Shopify/quilt/tree/master/packages/react-testing#trigger) method calls the `prop` with that name, updates the tree, and returns the result of the call.

```tsx
const tree = mount(() => {
  /* ... */
});

console.log(tree.find('Button').trigger('onPress'));
```

For more details on the available methods, refer to the [`@shopify/react-testing` documentation](https://github.com/Shopify/quilt/tree/master/packages/react-testing).

### Matchers

In addition to `mount()`, this library provides [Jest](https://jestjs.io) custom matchers. To include them in your environment, import the `@remote-ui/testing/matchers` entrypoint in any file included in Jest’s `setupFilesAfterEnv` option.

Once imported, you’ll be able to call the following matchers from any test:

#### `.toContainRemoteComponent(type: RemoteComponentType, props?: object)`

Asserts that at least one component matching `type` is in the descendants of the passed node. If the second argument is passed, this expectation will further filter the matches by components whose props are equal to the passed object (Jest’s asymmetric matchers, like `expect.objectContaining`, are fully supported).

```tsx
function render(root) {
  const button = root.createComponent('Button', {
    onPress: () => {},
  });

  button.append('Submit');
  root.append(button);
}

const myComponent = mount(render);
expect(myComponent).toContainRemoteComponent('Button', {
  onPress: expect.any(Function),
});
```

#### `.toContainRemoteComponentTimes(type: RemoteComponentType, times: number, props?: object)`

Asserts that a component matching `type` is in the descendants of the passed node a number of times. If the third argument is passed, this expectation will further filter the matches by components whose props are equal to the passed object (again, asymmetric matchers are fully supported). To assert that one component is or is not the descendant of the passed node use `.toContainRemoteComponent` or `.not.toContainRemoteComponent`.

#### `.toHaveRemoteProps(props: object)`

Checks whether the node has the specified props.

```tsx
function render(root) {
  const button = root.createComponent('Button', {
    primary: true,
  });

  button.append('Submit');
  root.append(button);
}

const myComponent = mount(render);
expect(myComponent.find('Button')).toHaveRemoteProps({primary: true});
```

#### `.toContainRemoteText(text: string)`

Asserts that the rendered output of the component contains the passed string as text content (that is, the text is included in what you would get by calling `textContent` on all root DOM nodes rendered by the component).

```tsx
function render(root) {
  const button = root.createComponent('Button', {
    onPress: () => {
      text.update('Goodbye!');
    },
  });

  const text = root.createText('Hello!');
  button.append(text);
  root.append(button);
}

const myComponent = mount(render);
myComponent.find('Button').trigger('onPress');

expect(myComponent.find('Button')).toContainRemoteText('Goodbye!');
```
