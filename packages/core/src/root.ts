import type {RemoteComponentType} from '@remote-ui/types';
import {isBasicObject} from '@remote-ui/rpc';

import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
  KIND_ROOT,
  KIND_COMPONENT,
  KIND_TEXT,
  KIND_FRAGMENT,
} from './types';
import type {
  Serialized,
  RemoteRoot,
  RemoteText,
  RemoteChannel,
  RemoteComponent,
  RemoteFragment,
  RemoteRootOptions,
  RemoteFragmentSerialization,
} from './types';
import {isRemoteFragment} from './utilities';

type AnyChild = RemoteText<any> | RemoteComponent<any, any>;
type AnyNode = AnyChild | RemoteFragment<any>;
type AnyParent =
  | RemoteRoot<any, any>
  | RemoteComponent<any, any>
  | RemoteFragment<any>;

interface RootInternals {
  strict: boolean;
  mounted: boolean;
  channel: RemoteChannel;
  nodes: WeakSet<AnyNode>;
  tops: WeakMap<AnyNode, AnyParent>;
  parents: WeakMap<AnyNode, AnyParent>;
  components: WeakMap<RemoteComponent<any, any>, ComponentInternals>;
  fragments: WeakMap<RemoteFragment<any>, FragmentInternals>;
  children: ReadonlyArray<AnyChild>;
}

interface ComponentInternals {
  externalProps: {readonly [key: string]: any};
  internalProps: {readonly [key: string]: any};
  children: ReadonlyArray<AnyChild>;
}

interface FragmentInternals {
  children: ReadonlyArray<AnyChild>;
}

type ParentInternals = RootInternals | ComponentInternals | FragmentInternals;

interface TextInternals {
  text: string;
}

const FUNCTION_CURRENT_IMPLEMENTATION_KEY = '__current';

const EMPTY_OBJECT = {} as any;
const EMPTY_ARRAY: any[] = [];

type HotSwappableFunction<T extends (...args: any[]) => any> = T & {
  [FUNCTION_CURRENT_IMPLEMENTATION_KEY]: any;
};

export function createRemoteRoot<
  AllowedComponents extends RemoteComponentType<
    string,
    any
  > = RemoteComponentType<any, any>,
  AllowedChildrenTypes extends AllowedComponents | boolean = true,
>(
  channel: RemoteChannel,
  {strict = true, components}: RemoteRootOptions<AllowedComponents> = {},
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
    components: new WeakMap(),
    fragments: new WeakMap(),
  };

  if (strict) Object.freeze(components);

  const remoteRoot: Root = {
    kind: KIND_ROOT,
    options: strict
      ? Object.freeze({strict, components})
      : {strict, components},
    get children() {
      return rootInternals.children as any;
    },
    createComponent(type, ...rest) {
      if (components && components.indexOf(type) < 0) {
        throw new Error(`Unsupported component: ${type}`);
      }

      const [initialProps, initialChildren, ...moreChildren] = rest;

      const normalizedInitialProps = initialProps ?? {};
      const normalizedInitialChildren: AnyChild[] = [];
      const normalizedInternalProps: {[key: string]: any} = {};

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

          normalizedInternalProps[key] = makeValueHotSwappable(
            serializeProp(initialProps[key]),
          );
        }
      }

      if (initialChildren) {
        if (Array.isArray(initialChildren)) {
          for (const child of initialChildren) {
            normalizedInitialChildren.push(normalizeChild(child, remoteRoot));
          }
        } else {
          normalizedInitialChildren.push(
            normalizeChild(initialChildren, remoteRoot),
          );

          // The complex tuple type of `rest` makes it so `moreChildren` is
          // incorrectly inferred as potentially being the props of the component,
          // lazy casting since we know it will be an array of child elements
          // (or empty).
          for (const child of moreChildren as any[]) {
            normalizedInitialChildren.push(normalizeChild(child, remoteRoot));
          }
        }
      }

      const id = `${currentId++}`;

      const internals: ComponentInternals = {
        externalProps: strict
          ? Object.freeze(normalizedInitialProps)
          : normalizedInitialProps,
        internalProps: normalizedInternalProps,
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
          return internals.externalProps;
        },
        get remoteProps() {
          return internals.internalProps;
        },
        remove: () => remove(component),
        updateProps: (newProps) =>
          updateProps(component, newProps, internals, rootInternals),
        append: (...children) =>
          append(
            component,
            children.map((child) => normalizeChild(child, remoteRoot)),
            internals,
            rootInternals,
          ),
        appendChild: (child) =>
          appendChild(
            component,
            normalizeChild(child, remoteRoot),
            internals,
            rootInternals,
          ),
        removeChild: (child) =>
          removeChild(component, child, internals, rootInternals),
        replaceChildren: (...children) =>
          replaceChildren(
            component,
            children.map((child) => normalizeChild(child, remoteRoot)),
            internals,
            rootInternals,
          ),
        insertBefore: (child, before) =>
          insertBefore(
            component,
            normalizeChild(child, remoteRoot),
            before,
            internals,
            rootInternals,
          ),
        insertChildBefore: (child, before) =>
          insertBefore(
            component,
            normalizeChild(child, remoteRoot),
            before,
            internals,
            rootInternals,
          ),
        // Just satisfying the type definition, since we need to write
        // some properties manually, which we do below. If we just `as any`
        // the whole object, we lose the implicit argument types for the
        // methods above.
        ...EMPTY_OBJECT,
      };

      rootInternals.components.set(component, internals);

      Object.defineProperty(component, 'type', {
        value: type,
        configurable: false,
        writable: false,
        enumerable: true,
      });

      makePartOfTree(component, rootInternals);
      makeRemote(component, id, remoteRoot);

      for (const child of internals.children) {
        moveNodeToContainer(component, child, rootInternals);
      }

      return component;
    },
    createText(content = '') {
      const id = `${currentId++}`;
      const internals: TextInternals = {text: content};
      const update: RemoteText<Root>['update'] = (newText) =>
        updateText(text, newText, internals, rootInternals);

      const text: RemoteText<Root> = {
        kind: KIND_TEXT,
        get text() {
          return internals.text;
        },
        update,
        updateText: update,
        remove: () => remove(text),
        // Just satisfying the type definition, since we need to write
        // some properties manually.
        ...EMPTY_OBJECT,
      };

      makePartOfTree(text, rootInternals);
      makeRemote(text, id, remoteRoot);

      return text;
    },
    createFragment() {
      const id = `${currentId++}`;

      const internals: FragmentInternals = {
        children: strict ? Object.freeze([]) : [],
      };

      const fragment: RemoteFragment<Root> = {
        kind: KIND_FRAGMENT,
        get children() {
          return internals.children;
        },
        append: (...children) =>
          append(
            fragment,
            children.map((child) => normalizeChild(child, remoteRoot)),
            internals,
            rootInternals,
          ),
        appendChild: (child) =>
          appendChild(
            fragment,
            normalizeChild(child, remoteRoot),
            internals,
            rootInternals,
          ),
        removeChild: (child) =>
          removeChild(fragment, child, internals, rootInternals),
        replaceChildren: (...children) =>
          replaceChildren(
            fragment,
            children.map((child) => normalizeChild(child, remoteRoot)),
            internals,
            rootInternals,
          ),
        insertBefore: (child, before) =>
          insertBefore(
            fragment,
            normalizeChild(child, remoteRoot),
            before,
            internals,
            rootInternals,
          ),
        insertChildBefore: (child, before) =>
          insertBefore(
            fragment,
            normalizeChild(child, remoteRoot),
            before,
            internals,
            rootInternals,
          ),

        // Just satisfying the type definition, since we need to write
        // some properties manually.
        ...EMPTY_OBJECT,
      };

      rootInternals.fragments.set(fragment, internals);

      makePartOfTree(fragment, rootInternals);
      makeRemote(fragment, id, remoteRoot);

      return fragment;
    },

    append: (...children) =>
      append(
        remoteRoot,
        children.map((child) => normalizeChild(child, remoteRoot)),
        rootInternals,
        rootInternals,
      ),
    appendChild: (child) =>
      appendChild(
        remoteRoot,
        normalizeChild(child, remoteRoot),
        rootInternals,
        rootInternals,
      ),
    replaceChildren: (...children) =>
      replaceChildren(
        remoteRoot,
        children.map((child) => normalizeChild(child, remoteRoot)),
        rootInternals,
        rootInternals,
      ),
    removeChild: (child) =>
      removeChild(remoteRoot, child, rootInternals, rootInternals),
    insertBefore: (child, before) =>
      insertBefore(
        remoteRoot,
        normalizeChild(child, remoteRoot),
        before,
        rootInternals,
        rootInternals,
      ),
    insertChildBefore: (child, before) =>
      insertBefore(
        remoteRoot,
        normalizeChild(child, remoteRoot),
        before,
        rootInternals,
        rootInternals,
      ),
    mount() {
      if (rootInternals.mounted) return Promise.resolve();

      rootInternals.mounted = true;
      return Promise.resolve(
        channel(ACTION_MOUNT, rootInternals.children.map(serializeChild)),
      );
    },
  };

  return remoteRoot;
}

function connected(element: AnyNode, {tops}: RootInternals) {
  return tops.get(element)?.kind === KIND_ROOT;
}

function allDescendants(element: AnyNode, withEach: (item: AnyNode) => void) {
  const recurse = (element: AnyNode) => {
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
  const {internalProps: currentProps, externalProps: currentExternalProps} =
    internals;

  const normalizedNewProps: {[key: string]: any} = {};
  const hotSwapFunctions: HotSwapRecord[] = [];
  let hasRemoteChange = false;

  for (const key of Object.keys(newProps)) {
    // See notes above for why we treat `children` as a reserved prop.
    if (key === 'children') continue;

    const currentExternalValue = currentExternalProps[key];
    const newExternalValue = newProps[key];

    const currentValue = currentProps[key];
    const newValue = serializeProp(newExternalValue);

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

    if (isRemoteFragment(currentExternalValue)) {
      removeNodeFromContainer(currentExternalValue, rootInternals);
    }
    if (isRemoteFragment(newExternalValue)) {
      moveNodeToContainer(component, newExternalValue, rootInternals);
    }
  }

  return perform(component, rootInternals, {
    remote: (channel) => {
      if (hasRemoteChange) {
        channel(ACTION_UPDATE_PROPS, component.id, normalizedNewProps);
      }
    },
    local: () => {
      const mergedExternalProps = {
        ...currentExternalProps,
        ...newProps,
      };

      internals.externalProps = strict
        ? Object.freeze(mergedExternalProps)
        : mergedExternalProps;

      internals.internalProps = {
        ...internals.internalProps,
        ...normalizedNewProps,
      };

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
// root.append(textField);
// root.append(button);
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

type HotSwapResult = [any, HotSwapRecord[]?];

function tryHotSwappingValues(
  currentValue: unknown,
  newValue: unknown,
  seen = new Set<any>(),
): HotSwapResult {
  if (seen.has(currentValue)) {
    return [IGNORE];
  }

  if (
    typeof currentValue === 'function' &&
    FUNCTION_CURRENT_IMPLEMENTATION_KEY in currentValue
  ) {
    seen.add(currentValue);
    const result: HotSwapResult = [
      typeof newValue === 'function' ? IGNORE : makeValueHotSwappable(newValue),
      [[currentValue as HotSwappableFunction<any>, newValue]],
    ];

    return result;
  }

  if (Array.isArray(currentValue)) {
    seen.add(currentValue);
    const result = tryHotSwappingArrayValues(currentValue, newValue, seen);

    return result;
  }

  if (isBasicObject(currentValue) && !isRemoteFragment(currentValue)) {
    seen.add(currentValue);
    const result = tryHotSwappingObjectValues(currentValue, newValue, seen);

    return result;
  }

  const result: HotSwapResult = [currentValue === newValue ? IGNORE : newValue];

  return result;
}

function makeValueHotSwappable(
  value: unknown,
  seen = new Map<any, any>(),
): unknown {
  const seenValue = seen.get(value);
  if (seenValue) return seenValue;

  if (isRemoteFragment(value)) {
    seen.set(value, value);
    return value;
  }

  if (Array.isArray(value)) {
    const result: any[] = [];
    seen.set(value, result);

    for (const nested of value) {
      result.push(makeValueHotSwappable(nested, seen));
    }

    return result;
  }

  if (isBasicObject(value)) {
    const result: Record<string, any> = {};
    seen.set(value, result);

    for (const key of Object.keys(value)) {
      result[key] = makeValueHotSwappable((value as any)[key], seen);
    }

    return result;
  }

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

    seen.set(value, wrappedFunction);

    return wrappedFunction;
  }

  return value;
}

function collectNestedHotSwappableValues(
  value: unknown,
  seen: Set<any> = new Set(),
): HotSwappableFunction<any>[] | undefined {
  if (seen.has(value)) return undefined;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.reduce<HotSwappableFunction<any>[]>((all, element) => {
      const nested = collectNestedHotSwappableValues(element, seen);
      return nested ? [...all, ...nested] : all;
    }, []);
  }

  if (isBasicObject(value)) {
    return Object.keys(value).reduce<HotSwappableFunction<any>[]>(
      (all, key) => {
        const nested = collectNestedHotSwappableValues(
          (value as any)[key],
          seen,
        );
        return nested ? [...all, ...nested] : all;
      },
      [],
    );
  }

  if (typeof value === 'function') {
    return FUNCTION_CURRENT_IMPLEMENTATION_KEY in value ? [value] : undefined;
  }

  return undefined;
}

function remove(child: AnyChild) {
  (child.parent as AnyParent)?.removeChild(child);
}

function append(
  container: AnyParent,
  children: AnyChild[],
  internals: ParentInternals,
  rootInternals: RootInternals,
) {
  for (const child of children) {
    appendChild(container, child, internals, rootInternals);
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
      `Cannot append a node that was not created by this remote root`,
    );
  }

  const currentParent = child.parent;
  const existingIndex = currentParent?.children.indexOf(child) ?? -1;

  return perform(container, rootInternals, {
    remote: (channel) => {
      channel(
        ACTION_INSERT_CHILD,
        (container as any).id,
        existingIndex < 0
          ? container.children.length
          : container.children.length - 1,
        serializeChild(child),
        currentParent ? currentParent.id : false,
      );
    },
    local: () => {
      moveNodeToContainer(container, child, rootInternals);

      let newChildren: AnyChild[];

      if (currentParent) {
        const currentInternals = getCurrentInternals(
          currentParent,
          rootInternals,
        )!;
        const currentChildren = [...currentInternals.children];
        currentChildren.splice(existingIndex, 1);

        if (currentParent === container) {
          newChildren = currentChildren;
        } else {
          currentInternals.children = strict
            ? Object.freeze(currentChildren)
            : currentChildren;

          newChildren = [...internals.children];
        }
      } else {
        newChildren = [...internals.children];
      }

      newChildren.push(child);
      internals.children = strict ? Object.freeze(newChildren) : newChildren;
    },
  });
}

function replaceChildren(
  container: AnyParent,
  children: AnyChild[],
  internals: ParentInternals,
  rootInternals: RootInternals,
) {
  for (const child of container.children) {
    removeChild(container, child, internals, rootInternals);
  }

  append(container, children, internals, rootInternals);
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
  const {strict} = rootInternals;

  const childIndex = container.children.indexOf(child as any);
  if (childIndex === -1) {
    return undefined;
  }

  return perform(container, rootInternals, {
    remote: (channel) =>
      channel(ACTION_REMOVE_CHILD, (container as any).id, childIndex),
    local: () => {
      removeNodeFromContainer(child, rootInternals);
      const newChildren = [...internals.children];
      newChildren.splice(newChildren.indexOf(child), 1);
      internals.children = strict ? Object.freeze(newChildren) : newChildren;
    },
  });
}

function insertBefore(
  container: AnyParent,
  child: AnyChild,
  before: AnyChild | undefined | null,
  internals: ParentInternals,
  rootInternals: RootInternals,
) {
  const {strict, nodes} = rootInternals;

  if (!nodes.has(child)) {
    throw new Error(
      `Cannot insert a node that was not created by this remote root`,
    );
  }

  const currentParent = child.parent;
  const existingIndex = currentParent?.children.indexOf(child) ?? -1;

  return perform(container, rootInternals, {
    remote: (channel) => {
      const beforeIndex =
        before == null
          ? container.children.length - 1
          : container.children.indexOf(before as any);

      channel(
        ACTION_INSERT_CHILD,
        (container as any).id,
        beforeIndex < existingIndex || existingIndex < 0
          ? beforeIndex
          : beforeIndex - 1,
        serializeChild(child),
        currentParent ? currentParent.id : false,
      );
    },
    local: () => {
      moveNodeToContainer(container, child, rootInternals);

      let newChildren: AnyChild[];

      if (currentParent) {
        const currentInternals = getCurrentInternals(
          currentParent,
          rootInternals,
        )!;

        const currentChildren = [...currentInternals.children];
        currentChildren.splice(existingIndex, 1);

        if (currentParent === container) {
          newChildren = currentChildren;
        } else {
          currentInternals.children = strict
            ? Object.freeze(currentChildren)
            : currentChildren;

          newChildren = [...internals.children];
        }
      } else {
        newChildren = [...internals.children];
      }

      if (before == null) {
        newChildren.push(child);
      } else {
        newChildren.splice(newChildren.indexOf(before), 0, child);
      }

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

function moveNodeToContainer(
  container: AnyParent,
  node: AnyNode,
  rootInternals: RootInternals,
) {
  const {tops, parents} = rootInternals;
  const newTop =
    container.kind === KIND_ROOT ? container : tops.get(container)!;

  tops.set(node, newTop);
  parents.set(node, container);

  moveFragmentToContainer(node, rootInternals);

  allDescendants(node, (descendant) => {
    tops.set(descendant, newTop);
    moveFragmentToContainer(descendant, rootInternals);
  });
}

function moveFragmentToContainer(node: AnyNode, rootInternals: RootInternals) {
  if (node.kind !== KIND_COMPONENT) return;

  const props = node.props as any;
  if (!props) return;

  Object.values(props).forEach((prop) => {
    if (!isRemoteFragment(prop)) return;
    moveNodeToContainer(node, prop, rootInternals);
  });
}

function removeNodeFromContainer(node: AnyNode, rootInternals: RootInternals) {
  const {tops, parents} = rootInternals;

  tops.delete(node);
  parents.delete(node);

  allDescendants(node, (descendant) => {
    tops.delete(descendant);
    removeFragmentFromContainer(descendant, rootInternals);
  });

  removeFragmentFromContainer(node, rootInternals);
}

function removeFragmentFromContainer(
  node: AnyNode,
  rootInternals: RootInternals,
) {
  if (node.kind !== KIND_COMPONENT) return;

  const props = node.remoteProps as any;
  for (const key of Object.keys(props ?? {})) {
    const prop = props[key];
    if (!isRemoteFragment(prop)) continue;

    removeNodeFromContainer(prop, rootInternals);
  }
}

function makePartOfTree(node: AnyNode, {parents, tops, nodes}: RootInternals) {
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

function serializeChild(value: AnyChild): Serialized<typeof value> {
  return value.kind === KIND_TEXT
    ? {id: value.id, kind: value.kind, text: value.text}
    : {
        id: value.id,
        kind: value.kind,
        type: value.type,
        props: value.remoteProps,
        children: value.children.map((child) => serializeChild(child)),
      };
}

function serializeProp(prop: any) {
  if (isRemoteFragment(prop)) {
    return serializeFragment(prop);
  }
  return prop;
}

function serializeFragment(
  value: RemoteFragment<any>,
): RemoteFragmentSerialization {
  return {
    id: value.id,
    kind: value.kind,
    get children() {
      return value.children.map((child) => serializeChild(child));
    },
  };
}

function getCurrentInternals(
  currentParent: AnyChild['parent'],
  rootInternals: RootInternals,
): ParentInternals | undefined {
  if (currentParent.kind === KIND_ROOT) {
    return rootInternals;
  }
  if (currentParent.kind === KIND_FRAGMENT) {
    return rootInternals.fragments.get(currentParent);
  }
  return rootInternals.components.get(currentParent);
}

function makeRemote<Root extends RemoteRoot<any, any>>(
  value: RemoteText<Root> | RemoteComponent<any, Root> | RemoteFragment<Root>,
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

function tryHotSwappingObjectValues(
  currentValue: object,
  newValue: unknown,
  seen: Set<any>,
): HotSwapResult {
  if (!isBasicObject(newValue)) {
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
    const currentObjectValue = (currentValue as any)[key];

    if (!(key in newValue)) {
      hasChanged = true;

      const nestedHotSwappables =
        collectNestedHotSwappableValues(currentObjectValue);

      if (nestedHotSwappables) {
        hotSwaps.push(
          ...nestedHotSwappables.map(
            (hotSwappable) => [hotSwappable, undefined] as const,
          ),
        );
      }
    }

    const newObjectValue = (newValue as any)[key];

    const [updatedValue, elementHotSwaps] = tryHotSwappingValues(
      currentObjectValue,
      newObjectValue,
      seen,
    );

    if (elementHotSwaps) {
      hotSwaps.push(...elementHotSwaps);
    }

    if (updatedValue !== IGNORE) {
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

function tryHotSwappingArrayValues(
  currentValue: unknown[],
  newValue: unknown,
  seen: Set<any>,
): HotSwapResult {
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
    const currentArrayValue = currentValue[i];
    const newArrayValue = newValue[i];

    if (i < newLength) {
      if (i >= currentLength) {
        hasChanged = true;
        normalizedNewValue[i] = makeValueHotSwappable(newArrayValue);
        continue;
      }

      const [updatedValue, elementHotSwaps] = tryHotSwappingValues(
        currentArrayValue,
        newArrayValue,
        seen,
      );

      if (elementHotSwaps) hotSwaps.push(...elementHotSwaps);

      if (updatedValue === IGNORE) {
        normalizedNewValue[i] = currentArrayValue;
        continue;
      }

      hasChanged = true;
      normalizedNewValue[i] = updatedValue;
    } else {
      hasChanged = true;

      const nestedHotSwappables =
        collectNestedHotSwappableValues(currentArrayValue);

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
