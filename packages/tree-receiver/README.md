# `@remote-dom/tree-receiver`

A RemoteReceiver implementation for Virtual DOM hosts.

Maintains a mutable representation of the remote tree that can be materialized to JSX.
Modifications to a node in the tree invalidate the materialized JSX upward to the root.
This means you can re-render the entire materialized JSX tree every time it changes, and
unchanged subtress get skipped since they are referentially-equal to the previous tree.

> ### Why this approach is useful:
>
> 1. Host components receive a `children` prop containing true JSX children, not wrapper components.
> 2. The host always has a complete up-to-date traversible copy of the entire tree and its state,
>    which is extremely useful for implementing sanitization and contextualization.
> 3. Traversal/validation/transformation applied to HostNode is agnostic to the VDOM renderer.
> 4. HostNode can be extended to alter the rendering and invalidation behavior at any point in the tree.
>    This could be used to implement host bindings that render to a mix of VDOM and Web Components.
> 5. The tree and its recursive JSX materialization provide an easy way to construct "proxy" props
>    to pass into host components for things like event handlers and (input) state reflection.
>
> ### Isn't it slow to always start rendering from the root?
>
> While it's technically slightly more expensive, this is actually how React's current
> implementation works for subtree updates (~setState) anyway. There is also a way to
> switch to subtree updates on a case-by-case basis, which the Preact implementation uses.

## Installation

```sh
npm install @remote-dom/core @remote-dom/tree-receiver --save # npm
pnpm install @remote-dom/core @remote-dom/tree-receiver --save # pnpm
yarn add @remote-dom/core @remote-dom/tree-receiver # yarn
```

## Usage

This package has three entrypoints: a React tree receiver and a Preact tree receiver,
as well as the base tree receiver from which they are derived.

Aside from some rendering optimizations in the Preact version, the only difference
between receivers is the `createElement()` function they are given to construct JSX,
which also infers the correct framework-specific types for their materialized JSX trees.

#### `TreeReceiver`

The base `TreeReceiver` can be used with any JSX/VDOM renderer.
It exposes a `.resolved()` method that returns the full JSX tree
built using the `createElement` factory you passed to `TreeReciever()`.

The following options are available to be passed to `new TreeReceiver({...})`:

```ts
interface TreeReceiverOptions {
  // optional memory management helpers
  retain?(): void;
  release?(): void;

  // A function to call every time the tree is invalidated
  rerender?(root: JSX.Element): void;

  // Components to expose as elements in the remote environment
  components?: Map<string, ComponentType>;

  // Listener types to register across the whole tree (skip invalidation on listener add/remove)
  events?: Record<string, true>;

  // The JSX element factory to use when materializing the tree.
  createElement(
    type: ComponentType,
    props: {children?: JSX.Element[]} & Record<string, any>,
  ): JSX.Element;
}
```

Once constructed, `TreeReceiver` provides the following methods and properties:

```ts
interface TreeReceiver {
  // Returns the current full VDOM tree
  resolved(): JSX.Element;

  // A function to call when the tree is updated
  rerender: (tree: JSX.Element) => void;

  // the RemoteConnection, to be passed to the remote side
  connection: RemoteConnection;
}
```

Here you can see an example where we are using TreeReceiver to render in
three different frameworks in the same module:

```ts
import {TreeReceiver} from '@remote-dom/tree-receiver';

// react:
import React from 'react';
const receiver = new TreeReceiver({createElement: React.createElement});
const tree = receiver.resolved(); // a standard ReactElement/React.JSX.Element

// preact:
import {h} from 'preact';
const receiver = new TreeReceiver({createElement: h});
const tree = receiver.resolved(); // a Preact JSX.Element

// vue:
import Vue from 'vue';
Vue.component('vue-demo', {
  render(createElement) {
    const receiver = new TreeReceiver({createElement});
    return receiver.resolved(); // a Vue JSX.Element
  },
});
```

#### `ReactTreeReceiver`

This is a tiny convenience wrapper around `TreeReceiver`
that passes `React.createElement` to the constructor for you.

**Usage example:**

```tsx
import {createRoot} from 'react-dom/client';
import {ReactTreeReceiver} from '@remote-dom/tree-receiver/react';

// Register plain ol' React components to be exposed as elements:
function Button({onPress, children}) {
  return <button onClick={onPress}>{children}</button>;
}
function Stack({spacing, children}) {
  return <div className={`stack spacing-${spacing}`}>{children}</div>;
}
const components = new Map([
  ['ui-button', Button],
  ['ui-stack', Stack],
]);

function Extension() {
  // you can store the JSX tree anywhere - state, signal, etc
  const [tree, setTree] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const receiver = new ReactTreeReceiver({
      components,
      rerender: (jsx) => setTree(jsx), // just put the updated tree in state
    });

    const sandbox = createThreadFromWebWorker(new Worker('/sandbox.js'));
    sandbox.render(receiver.connection /*, api*/);
  }, []);

  // the tree is just JSX, so you can return/render it anywhere JSX works.
  return tree;
}

createRoot(document.body).render(<Extension />);
```

#### `PreactTreeReceiver`

A convenience wrapper around `TreeReceiver` that passes Preact's `createElement` to the
constructor for you. Unlike `ReactTreeReceiver`, this includes a transparent optimization
that re-renders subtrees in-place rather than always starting from the root of the tree.

**Usage example:**

```tsx
import {render} from 'preact';
import {PreactTreeReceiver} from '@remote-dom/tree-receiver/preact';

// Register plain ol' Preact components to be exposed as elements:
function Button({onPress, children}) {
  return <button onClick={onPress}>{children}</button>;
}
function Stack({spacing, children}) {
  return <div className={`stack spacing-${spacing}`}>{children}</div>;
}
const components = new Map([
  ['ui-button', Button],
  ['ui-stack', Stack],
]);

function Extension() {
  // you can store the JSX tree anywhere - state, signal, etc
  const [tree, rerender] = useState<JSX.Element | null>(null);

  useEffect(() => {
    const receiver = new PreactTreeReceiver({
      components,
      rerender, // just put the updated tree in state
    });

    const sandbox = createThreadFromWebWorker(new Worker('/sandbox.js'));
    sandbox.render(receiver.connection /*, api*/);
  }, []);

  // the tree is just JSX, so you can return/render it anywhere JSX works.
  return tree;
}

render(<Extension />, document.body);
```
