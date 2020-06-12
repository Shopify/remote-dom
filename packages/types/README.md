# `@remote-ui/types`

This library provides a couple of utility types used in other remote-ui libraries. All of these types are re-exported from [`@remote-ui/core`](../core).

## Types

### `RemoteComponentType<Type, Props, AllowedChildren>`

A “type” in remote-ui is represented with a humble string. You pass a string to [`RemoteRoot#createComponent](../core#remoterootcreatecomponent) in order to create a new component instance, and a string identifier for the component is the only required argument. However, many of the remote-ui libraries have support for a more strongly-typed version of that string, which is the purpose of `RemoteComponentType`. This type is still “just a string”, but includes additional type parameters for the type of the properties allowed for that component, and for the types of components this component accepts as children. The [`RemoteComponent` APIs](../core#remotecomponent), as well as a number of others, use these types to offer you editor autocompletion on property names, and other helpful type checking.

The `AllowedChildren` argument does not perform any runtime validation, it only provides compile-time checking to ensure value children are appended to a component. If your component accepts any child, including being able to accept text nodes as children, you can pass `true` for this type parameter (or leave it unset, as the default is `true`).

### `IdentifierForRemoteComponent<Type>`

If the `Type` parameter is a `RemoteComponentType`, this will extract the exact string type that is that component’s unique name.

```ts
type Button = RemoteComponent<'Button', {onPress(): void}>;
type ButtonType = IdentifierForRemoteComponent<Button>; // 'Button'
```

### `PropsForRemoteComponent<Type>`

If the `Type` parameter is a `RemoteComponentType`, this will extract the props type for that component

```ts
type Button = RemoteComponent<'Button', {onPress(): void}>;
type ButtonType = PropsForRemoteComponent<Button>; // {onPress(): void}
```
