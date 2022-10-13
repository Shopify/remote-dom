# `@remote-ui/webcompat`

This library provides a Browser-like DOM environment atop Remote UI, backed by a [`@remote-ui/core` `ReactRoot`](../core#remoteroot). Component are exposed as named elements similar to Custom Elements.

## Installation

Using `yarn`:

```
yarn add @remote-ui/webcompat
```

or, using `npm`:

```
npm install @remote-ui/webcompat --save
```

## Usage

`@remote-ui/webcompat` provides a single factory functions that returns a `Document` instance and corresponding environment. To render content into a [`@remote-ui/core` `RemoteRoot`](../core#remoteroot), create a `<remote-root>` element and set its `name` attribute to the named `RemoteRoot` to render into, then manipulate its subtree.

```ts
import {createDocument} from '@remote-ui/webcompat';

// Create the document environment:
const document = createDocument();
Object.assign(self, document.defaultView);

// Create a remote root, which is just a DOM element
const root = document.createElement('remote-root');
root.setAttribute('name', 'Contacts::MenuItems');

// Create a UI using DOM:
const button = document.createElement('button');
button.primary = true;
button.onclick = () => {
  button.textContent = 'Pressed!';
};
button.textContent = 'Press Me!';
root.appendChild(button);
```
