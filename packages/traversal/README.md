# `@remote-ui/traversal`

This package provides a set of utility functions for finding components within a [`@remote-ui/core` `RemoteRoot`](../core#remoteroot).

## Installation

Using `yarn`:

```
yarn add @remote-ui/traversal
```

or, using `npm`:

```
npm install @remote-ui/traversal --save
```

## Usage

### `find()`

Returns the nearest descendant [`RemoteComponent`](../core#remotecomponent) whose type matches the passed type.

```ts
import {createRemoteRoot} from '@remote-ui/core';
import {find} from '@remote-ui/traversal';

const root = createRemoteRoot(() => {});
const buttonGroup = root.createComponent('ButtonGroup');

buttonGroup.appendChild(root.createComponent('Button'));
root.appendChild(buttonGroup);

const button = find(root, 'Button');
```

You can optionally pass a `props` argument as the third parameter. This will find a matching component with a matching subset of props.

```ts
import {createRemoteRoot} from '@remote-ui/core';
import {find} from '@remote-ui/traversal';

const root = createRemoteRoot(() => {});
const buttonGroup = root.createComponent('ButtonGroup');
const buttonOne = root.createComponent('Button', {id: 'one'});

buttonGroup.appendChild(buttonOne);
buttonGroup.appendChild(root.createComponent('Button', {id: 'two'}));
root.appendChild(buttonGroup);

const buttonTwo = find(root, 'Button', {id: 'two'});
```

### `findAll()`

Like `find()`, but returns all matching components in an array.

### `closest()`

Returns the component passed as the first argument, if it matches the type (and optional props) passed to this function, or returns the first matching ancestor that does match by traversing recursively through all parents.

```ts
import {createRemoteRoot} from '@remote-ui/core';
import {closest} from '@remote-ui/traversal';

const root = createRemoteRoot(() => {});
const buttonGroup = root.createComponent('ButtonGroup');
const button = root.createComponent('Button');

buttonGroup.appendChild(button);
root.appendChild(buttonGroup);

const foundButtonGroup = closest(button, 'ButtonGroup'); // same as buttonGroup
```
