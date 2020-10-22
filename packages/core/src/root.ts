import {RemoteComponentType} from '@remote-ui/types';
import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
  KIND_ROOT,
  KIND_COMPONENT,
  KIND_TEXT,
} from './types';
import type {
  Serialized,
  RemoteRoot,
  RemoteText,
  RemoteChannel,
  RemoteComponent,
} from './types';

export interface Options<
  AllowedComponents extends RemoteComponentType<string, any>
> {
  readonly strict?: boolean;
  readonly components?: readonly AllowedComponents[];
}

type AnyChild = RemoteText<any> | RemoteComponent<any, any>;
type AnyParent = RemoteRoot<any, any> | RemoteComponent<any, any>;

interface RootInternals {
  strict: boolean;
  mounted: boolean;
  channel: RemoteChannel;
  nodes: WeakSet<AnyChild>;
  tops: WeakMap<AnyChild, AnyParent>;
  parents: WeakMap<AnyChild, AnyParent>;
  children: readonly AnyChild[];
}

interface ComponentInternals {
  props: {readonly [key: string]: any};
  children: readonly AnyChild[];
}

type ParentInternals = RootInternals | ComponentInternals;

interface TextInternals {
  text: string;
}

const FUNCTION_CURRENT_IMPLEMENTATION_KEY = '__current';

const EMPTY_OBJECT = {} as any;
const EMPTY_ARRAY: any[] = [];

type HotSwappableFunction<T extends Function> = T & {
  [FUNCTION_CURRENT_IMPLEMENTATION_KEY]: any;
};

export function createRemoteRoot<
  AllowedComponents extends RemoteComponentType<
    string,
    any
  > = RemoteComponentType<any, any>,
  AllowedChildrenTypes extends AllowedComponents | boolean = true
>(
  channel: RemoteChannel,
  {strict = true, components}: Options<AllowedComponents> = {},
): RemoteRoot<AllowedComponents, AllowedChildrenTypes> {
  type Root = RemoteRoot<AllowedComponents, AllowedChildrenTypes>;

  let currentId = 0;

  const rootInternals: RootInternals = {
    strict,
    mounted: false,
    channel,
    children: EMPTY_ARRAY,
    nodes: new WeakSet(),
    parents: new WeakMap(),
    tops: new WeakMap(),
  };

  const remoteRoot: Root = {
    kind: KIND_ROOT,
    get children() {
      return rootInternals.children as any;
    },
    createComponent(type, ...rest) {
      if (components && components.indexOf(type) < 0) {
        throw new Error(`Unsupported component: ${type}`);
      }

      const [initialProps, initialChildren] = rest;

      const normalizedInitialChildren: AnyChild[] = [];
      const normalizedInitialProps: {[key: string]: any} = {};

      if (initialProps) {
        for (const key of Object.keys(initialProps)) {
          // "children" as a prop can be extremely confusing with the "children" of
          // a component. In React, a "child" can be anything, but once it reaches
          // a host environment (like this remote `Root`), we want "children" to have
          // only one meaning: the actual, resolved children components and text.
          //
          // To enforce this, we delete any prop named "children". We don’t take a copy
          // of the props for performance, so a user calling this function must do so
          // with an object that can handle being mutated.
          if (key === 'children') continue;

          normalizedInitialProps[key] = makeValueHotSwappable(
            initialProps[key],
          );
        }
      }

      if (initialChildren) {
        for (const child of initialChildren) {
          normalizedInitialChildren.push(normalizeChild(child, remoteRoot));
        }
      }

      const id = `${currentId++}`;

      const internals: ComponentInternals = {
        props: strict
          ? Object.freeze(normalizedInitialProps!)
          : normalizedInitialProps!,
        children: strict
          ? Object.freeze(normalizedInitialChildren)
          : normalizedInitialChildren,
      };

      const component: RemoteComponent<AllowedComponents, Root> = {
        kind: KIND_COMPONENT,
        get children() {
          return internals.children;
        },
        get props() {
          return internals.props;
        },
        updateProps: (newProps) =>
          updateProps(component, newProps, internals, rootInternals),
        appendChild: (child) =>
          appendChild(
            component,
            normalizeChild(child, remoteRoot),
            internals,
            rootInternals,
          ),
        removeChild: (child) =>
          removeChild(component, child, internals, rootInternals),
        insertChildBefore: (child, before) =>
          insertChildBefore(component, child, before, internals, rootInternals),
        // Just satisfying the type definition, since we need to write
        // some properties manually, which we do below. If we just `as any`
        // the whole object, we lose the implicit argument types for the
        // methods above.
        ...EMPTY_OBJECT,
      };

      Object.defineProperty(component, 'type', {
        value: type,
        configurable: false,
        writable: false,
        enumerable: true,
      });

      makePartOfTree(component, rootInternals);
      makeRemote(component, id, remoteRoot);

      for (const child of internals.children) {
        moveChildToContainer(component, child, rootInternals);
      }

      return component;
    },
    createText(content = '') {
      const id = `${currentId++}`;
      const internals: TextInternals = {text: content};

      const text: RemoteText<Root> = {
        kind: KIND_TEXT,
        get text() {
          return internals.text;
        },
        updateText: (newText) =>
          updateText(text, newText, internals, rootInternals),
        // Just satisfying the type definition, since we need to write
        // some properties manually.
        ...EMPTY_OBJECT,
      };

      makePartOfTree(text, rootInternals);
      makeRemote(text, id, remoteRoot);

      return text;
    },
    appendChild: (child) =>
      appendChild(
        remoteRoot,
        normalizeChild(child, remoteRoot),
        rootInternals,
        rootInternals,
      ),
    removeChild: (child) =>
      removeChild(remoteRoot, child, rootInternals, rootInternals),
    insertChildBefore: (child, before) =>
      insertChildBefore(
        remoteRoot,
        child,
        before,
        rootInternals,
        rootInternals,
      ),
    mount() {
      if (rootInternals.mounted) return Promise.resolve();

      rootInternals.mounted = true;
      return Promise.resolve(
        channel(ACTION_MOUNT, rootInternals.children.map(serialize)),
      );
    },
  };

  return remoteRoot;
}

function connected(element: AnyChild, {tops}: RootInternals) {
  return tops.get(element)?.kind === KIND_ROOT;
}

function allDescendants(element: AnyChild, withEach: (item: AnyChild) => void) {
  const recurse = (element: AnyChild) => {
    if ('children' in element) {
      for (const child of element.children) {
        withEach(child);
        recurse(child);
      }
    }
  };

  recurse(element);
}

function perform(
  element: AnyChild | AnyParent,
  rootInternals: RootInternals,
  {
    remote,
    local,
  }: {
    remote(channel: RemoteChannel): void | Promise<void>;
    local(): void;
  },
) {
  const {mounted, channel} = rootInternals;

  if (
    mounted &&
    (element.kind === KIND_ROOT || connected(element, rootInternals))
  ) {
    // should only create context once async queue is cleared
    remote(channel);

    // technically, we should be waiting for the remote update to apply,
    // then apply it locally. The implementation below is too naive because
    // it allows local updates to get out of sync with remote ones.
    // if (remoteResult == null || !('then' in remoteResult)) {
    //   local();
    //   return;
    // } else {
    //   return remoteResult.then(() => {
    //     local();
    //   });
    // }
  }

  local();
}

function updateText(
  text: RemoteText<any>,
  newText: string,
  internals: TextInternals,
  rootInternals: RootInternals,
) {
  return perform(text, rootInternals, {
    remote: (channel) => channel(ACTION_UPDATE_TEXT, text.id, newText),
    local: () => {
      internals.text = newText;
    },
  });
}

type HotSwapRecord = readonly [HotSwappableFunction<any>, any];

const IGNORE = Symbol('ignore');

function updateProps(
  component: RemoteComponent<any, any>,
  newProps: any,
  internals: ComponentInternals,
  rootInternals: RootInternals,
) {
  const {strict} = rootInternals;
  const {props: currentProps} = internals;

  const normalizedNewProps: {[key: string]: any} = {};
  const hotSwapFunctions: HotSwapRecord[] = [];
  let hasRemoteChange = false;

  for (const key of Object.keys(newProps)) {
    // See notes above for why we treat `children` as a reserved prop.
    if (key === 'children') continue;

    const currentValue = currentProps[key];
    const newValue = newProps[key];

    // Bail out if we have equal, primitive types
    if (
      currentValue === newValue &&
      (newValue == null || typeof newValue !== 'object')
    ) {
      continue;
    }

    const [value, hotSwaps] = tryHotSwappingValues(currentValue, newValue);

    if (hotSwaps) {
      hotSwapFunctions.push(...hotSwaps);
    }

    if (value === IGNORE) continue;

    hasRemoteChange = true;
    normalizedNewProps[key] = value;
  }

  return perform(component, rootInternals, {
    remote: (channel) => {
      if (hasRemoteChange) {
        channel(ACTION_UPDATE_PROPS, component.id, normalizedNewProps);
      }
    },
    local: () => {
      const mergedProps = {...internals.props, ...normalizedNewProps};
      internals.props = strict ? Object.freeze(mergedProps) : mergedProps;

      for (const [hotSwappable, newValue] of hotSwapFunctions) {
        hotSwappable[FUNCTION_CURRENT_IMPLEMENTATION_KEY] = newValue;
      }
    },
  });
}

// Imagine the following remote-ui components we might render in a remote context:
//
// const root = createRemoteRoot();
// const {value, onChange, onPress} = getPropsForValue();
//
// const textField = root.createComponent('TextField', {value, onChange});
// const button = root.createComponent('Button', {onPress});
//
// root.appendChild(textField);
// root.appendChild(button);
//
// function getPropsForValue(value = '') {
//   return {
//     value,
//     onChange: () => {
//       const {value, onChange, onPress} = getPropsForValue();
//       textField.updateProps({value, onChange});
//       button.updateProps({onPress});
//     },
//     onPress: () => console.log(value),
//   };
// }
//
//
// In this example, assume that the `TextField` `onChange` prop is run on blur.
// If this were running on the host, the following steps would happen if you pressed
// on the button:
//
// 1. The text field blurs, and so calls `onChange()` with its current value, which
//    then calls `setValue()` with the updated value.
// 2. We synchronously update the `value`, `onChange`, and `onPress` props to point at
//    the most current `value`.
// 3. Handling blur is finished, so the browser now handles the click by calling the
//    (newly-updated) `Button` `onPress()`, which logs out the new value.
//
// Because remote-ui reproduces a UI tree asynchronously from the remote context, the
// steps above run in a different order:
//
// 1. The text field blurs, and so calls `onChange()` with its current value.
// 2. Handling blur is finished **from the perspective of the main thread**, so the
//    browser now handles the click by calling the (original) `Button` `onPress()`, which
//    logs out the **initial** value.
// 3. In the remote context, we receive the `onChange()` call, which calls updates the props
//    on the `Button` and `TextField` to be based on the new `value`, but by now it’s
//    already too late for `onPress` — the old version has already been called!
//
// As you can see, the timing issue introduced by the asynchronous nature of remote-ui
// can cause “old props” to be called from the main thread. This example may seem like
// an unusual pattern, and it is if you are using `@remote-ui/core` directly; you’d generally
// keep a mutable reference to the state, instead of closing over the state with new props.
// However, abstractions on top of `@remote-ui/core`, like the React reconciler in
// `@remote-ui/react`, work almost entirely by closing over state, so this issue is
// much more common with those declarative libraries.
//
// To protect against this, we handle function props a bit differently. When we have a
// function prop, we replace it with a new function that calls the original. However,
// we make the original mutable, by making it a property on the function itself. When
// this function subsequently updates, we don’t send the update to the main thread (as
// we just saw, this can often be "too late" to be of any use). Instead, we swap out
// the mutable reference to the current implementation of the function prop, which can
// be done synchronously. In the example above, this would all happen synchronously in
// the remote context; in our handling of `TextField onChange()`, we update `Button onPress()`,
// and swap out the implementations. Now, when the main thread attempts to call `Button onPress()`,
// it instead calls our wrapper around the function, which can refer to, and call, the
// most recently-applied implementation, instead of directly calling the old implementation.

function tryHotSwappingValues(
  currentValue: unknown,
  newValue: unknown,
): [any, HotSwapRecord[]?] {
  if (
    typeof currentValue === 'function' &&
    FUNCTION_CURRENT_IMPLEMENTATION_KEY in currentValue
  ) {
    return [
      typeof newValue === 'function' ? IGNORE : makeValueHotSwappable(newValue),
      [[currentValue as HotSwappableFunction<any>, newValue]],
    ];
  }

  if (Array.isArray(currentValue)) {
    if (!Array.isArray(newValue)) {
      return [
        makeValueHotSwappable(newValue),
        collectNestedHotSwappableValues(currentValue)?.map(
          (hotSwappable) => [hotSwappable, undefined] as const,
        ),
      ];
    }

    let hasChanged = false;
    const hotSwaps: HotSwapRecord[] = [];

    const newLength = newValue.length;
    const currentLength = currentValue.length;
    const maxLength = Math.max(currentLength, newLength);

    const normalizedNewValue: any[] = [];

    for (let i = 0; i < maxLength; i++) {
      const currentElement = currentValue[i];
      const newElement = newValue[i];

      if (i < newLength) {
        if (i >= currentLength) {
          hasChanged = true;
          normalizedNewValue[i] = makeValueHotSwappable(newValue);
        } else {
          const [updatedValue, elementHotSwaps] = tryHotSwappingValues(
            currentElement,
            newElement,
          );

          if (elementHotSwaps) hotSwaps.push(...elementHotSwaps);

          if (updatedValue === IGNORE) {
            normalizedNewValue[i] = currentValue;
          } else {
            hasChanged = true;
            normalizedNewValue[i] = updatedValue;
          }
        }
      } else {
        hasChanged = true;

        const nestedHotSwappables = collectNestedHotSwappableValues(
          currentElement,
        );

        if (nestedHotSwappables) {
          hotSwaps.push(
            ...nestedHotSwappables.map(
              (hotSwappable) => [hotSwappable, undefined] as const,
            ),
          );
        }
      }
    }

    return [hasChanged ? normalizedNewValue : IGNORE, hotSwaps];
  }

  if (typeof currentValue === 'object' && currentValue != null) {
    if (typeof newValue !== 'object' || newValue == null) {
      return [
        makeValueHotSwappable(newValue),
        collectNestedHotSwappableValues(currentValue)?.map(
          (hotSwappable) => [hotSwappable, undefined] as const,
        ),
      ];
    }

    let hasChanged = false;
    const hotSwaps: HotSwapRecord[] = [];

    const normalizedNewValue: {[key: string]: any} = {};

    // eslint-disable-next-line guard-for-in
    for (const key in currentValue) {
      const currentElement = (currentValue as any)[key];

      if (!(key in newValue)) {
        hasChanged = true;

        const nestedHotSwappables = collectNestedHotSwappableValues(
          currentElement,
        );

        if (nestedHotSwappables) {
          hotSwaps.push(
            ...nestedHotSwappables.map(
              (hotSwappable) => [hotSwappable, undefined] as const,
            ),
          );
        }
      }

      const newElement = (newValue as any)[key];

      const [updatedValue, elementHotSwaps] = tryHotSwappingValues(
        currentElement,
        newElement,
      );

      if (elementHotSwaps) hotSwaps.push(...elementHotSwaps);

      if (updatedValue === IGNORE) {
        normalizedNewValue[key] = currentValue;
      } else {
        hasChanged = true;
        normalizedNewValue[key] = updatedValue;
      }
    }

    for (const key in newValue) {
      if (key in normalizedNewValue) continue;

      hasChanged = true;
      normalizedNewValue[key] = makeValueHotSwappable((newValue as any)[key]);
    }

    return [hasChanged ? normalizedNewValue : IGNORE, hotSwaps];
  }

  return [currentValue === newValue ? IGNORE : newValue];
}

function makeValueHotSwappable(value: unknown) {
  if (typeof value === 'function') {
    const wrappedFunction: HotSwappableFunction<any> = ((...args: any[]) => {
      return wrappedFunction[FUNCTION_CURRENT_IMPLEMENTATION_KEY](...args);
    }) as any;

    Object.defineProperty(
      wrappedFunction,
      FUNCTION_CURRENT_IMPLEMENTATION_KEY,
      {
        enumerable: false,
        configurable: false,
        writable: true,
        value,
      },
    );

    return wrappedFunction;
  }

  return value;
}

function collectNestedHotSwappableValues(
  value: unknown,
): HotSwappableFunction<any>[] | undefined {
  if (typeof value === 'function') {
    if (FUNCTION_CURRENT_IMPLEMENTATION_KEY in value) return [value];
  } else if (Array.isArray(value)) {
    return value.reduce<HotSwappableFunction<any>[]>((all, element) => {
      const nested = collectNestedHotSwappableValues(element);
      return nested ? [...all, ...nested] : all;
    }, []);
  } else if (typeof value === 'object' && value != null) {
    return Object.keys(value).reduce<HotSwappableFunction<any>[]>(
      (all, key) => {
        const nested = collectNestedHotSwappableValues((value as any)[key]);
        return nested ? [...all, ...nested] : all;
      },
      [],
    );
  }
}

function appendChild(
  container: AnyParent,
  child: AnyChild,
  internals: ParentInternals,
  rootInternals: RootInternals,
) {
  const {nodes, strict} = rootInternals;

  if (!nodes.has(child)) {
    throw new Error(
      `Cannot append a node that was not created by this Remote Root`,
    );
  }

  return perform(container, rootInternals, {
    remote: (channel) =>
      channel(
        ACTION_INSERT_CHILD,
        (container as any).id,
        container.children.length,
        serialize(child),
      ),
    local: () => {
      moveChildToContainer(container, child, rootInternals);

      const mergedChildren = [...internals.children, child];
      internals.children = strict
        ? Object.freeze(mergedChildren)
        : mergedChildren;
    },
  });
}

// there is a problem with this, because when multiple children
// are removed, there is no guarantee the messages will arrive in the
// order we need them to on the host side (it depends how React
// calls our reconciler). If it calls with, for example, the removal of
// the second last item, then the removal of the last item, it will fail
// because the indexes moved around.
//
// Might need to send the removed child ID, or find out if we
// can collect removals into a single update.
function removeChild(
  container: AnyParent,
  child: AnyChild,
  internals: ParentInternals,
  rootInternals: RootInternals,
) {
  const {strict, tops, parents} = rootInternals;

  return perform(container, rootInternals, {
    remote: (channel) =>
      channel(
        ACTION_REMOVE_CHILD,
        (container as any).id,
        container.children.indexOf(child),
      ),
    local: () => {
      parents.delete(child);

      if (child.kind === KIND_COMPONENT) {
        allDescendants(child, (descendant) => tops.set(descendant, child));
      }

      const newChildren = [...internals.children];
      newChildren.splice(newChildren.indexOf(child), 1);
      internals.children = strict ? Object.freeze(newChildren) : newChildren;
    },
  });
}

function insertChildBefore(
  container: AnyParent,
  child: AnyChild,
  before: AnyChild,
  internals: ParentInternals,
  rootInternals: RootInternals,
) {
  const {strict, nodes} = rootInternals;

  if (!nodes.has(child)) {
    throw new Error(
      `Cannot insert a node that was not created by this Remote Root`,
    );
  }

  return perform(container, rootInternals, {
    remote: (channel) =>
      channel(
        ACTION_INSERT_CHILD,
        (container as any).id,
        container.children.indexOf(before as any),
        serialize(child),
      ),
    local: () => {
      moveChildToContainer(container, child, rootInternals);

      const newChildren = [...internals.children];
      newChildren.splice(newChildren.indexOf(before), 0, child);
      internals.children = strict ? Object.freeze(newChildren) : newChildren;
    },
  });
}

function normalizeChild(
  child: AnyChild | string,
  root: RemoteRoot<any, any>,
): AnyChild {
  return typeof child === 'string' ? root.createText(child) : child;
}

function moveChildToContainer(
  container: AnyParent,
  child: AnyChild,
  {tops, parents}: RootInternals,
) {
  const newTop =
    container.kind === KIND_ROOT ? container : tops.get(container)!;

  tops.set(child, newTop);
  parents.set(child, container);
  allDescendants(child, (descendant) => tops.set(descendant, newTop));
}

function makePartOfTree(node: AnyChild, {parents, tops, nodes}: RootInternals) {
  nodes.add(node);

  Object.defineProperty(node, 'parent', {
    get() {
      return parents.get(node);
    },
    configurable: true,
    enumerable: true,
  });

  Object.defineProperty(node, 'top', {
    get() {
      return tops.get(node);
    },
    configurable: true,
    enumerable: true,
  });
}

function serialize(value: AnyChild): Serialized<typeof value> {
  return value.kind === KIND_TEXT
    ? {id: value.id, text: value.text}
    : {
        id: value.id,
        type: value.type,
        props: value.props,
        children: value.children.map((child) => serialize(child as any)),
      };
}

function makeRemote<Root extends RemoteRoot<any, any>>(
  value: RemoteText<Root> | RemoteComponent<any, Root>,
  id: string,
  root: Root,
) {
  Object.defineProperty(value, 'id', {
    value: id,
    configurable: true,
    writable: false,
    enumerable: false,
  });

  Object.defineProperty(value, 'root', {
    value: root,
    configurable: true,
    writable: false,
    enumerable: false,
  });
}
