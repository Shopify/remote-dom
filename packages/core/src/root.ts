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

const EMPTY_OBJECT = {} as any;
const EMPTY_ARRAY: any[] = [];

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

      let initialProps = rest[0];
      const initialChildren = rest[1];

      if (initialProps) {
        // "children" as a prop can be extremely confusing with the "children" of
        // a component. In React, a "child" can be anything, but once it reaches
        // a host environment (like this remote `Root`), we want "children" to have
        // only one meaning: the actual, resolved children components and text.
        //
        // To enforce this, we delete any prop named "children". We don’t take a copy
        // of the props for performance, so a user calling this function must do so
        // with an object that can handle being mutated.
        //
        // I didn’t think checking that the prop exists before deleting it would matter,
        // but I ran a few benchmarks and it ran substantially faster this way /shrug
        if (initialProps.children) delete initialProps.children;
      } else {
        initialProps = EMPTY_OBJECT;
      }

      const normalizedInitialChildren: AnyChild[] = [];

      if (initialChildren) {
        for (const child of initialChildren) {
          normalizedInitialChildren.push(normalizeChild(child, remoteRoot));
        }
      }

      const id = `${currentId++}`;

      const internals: ComponentInternals = {
        props: strict ? Object.freeze(initialProps!) : initialProps!,
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

function updateProps(
  component: RemoteComponent<any, any>,
  newProps: any,
  internals: ComponentInternals,
  rootInternals: RootInternals,
) {
  const {strict} = rootInternals;

  // See notes above for why we treat `children` as a reserved prop.
  if (newProps.children) delete newProps.children;

  return perform(component, rootInternals, {
    remote: (channel) => channel(ACTION_UPDATE_PROPS, component.id, newProps),
    local: () => {
      const mergedProps = {...internals.props, ...newProps};
      internals.props = strict ? Object.freeze(mergedProps) : mergedProps;
    },
  });
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
