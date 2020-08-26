import {RemoteComponentType} from '@remote-ui/types';
import {
  ACTION_MOUNT,
  ACTION_INSERT_CHILD,
  ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT,
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
  type Component = RemoteComponent<AllowedComponents, Root>;
  type Text = RemoteText<Root>;
  type HasChildren = Root | Component;
  type CanBeChild = Component | Text;

  const parents = new WeakMap<CanBeChild, HasChildren>();
  const children = new WeakMap<HasChildren, readonly CanBeChild[]>();
  const props = new WeakMap<Component, any>();
  const texts = new WeakMap<Text, string>();
  const tops = new WeakMap<CanBeChild, HasChildren>();
  const nodes = new WeakSet<CanBeChild>();

  let currentId = 0;
  let mounted = false;

  const remoteRoot: Root = {
    get children() {
      return children.get(remoteRoot) as any;
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
        initialProps = {} as any;
      }

      const id = `${currentId++}`;

      const component: RemoteComponent<AllowedComponents, Root> = {
        kind: KIND_COMPONENT,
        get children() {
          return children.get(component);
        },
        get props() {
          return props.get(component)!;
        },
        updateProps: (newProps) => updateProps(component, newProps),
        appendChild: (child) => appendChild(component, child),
        removeChild: (child) => removeChild(component, child),
        insertChildBefore: (child, before) =>
          insertChildBefore(component, child, before),
        // Just satisfying the type definition, since we need to write
        // some properties manually, which we do below. If we just `as any`
        // the whole object, we lose the implicit argument types for the
        // methods above.
        ...({} as any),
      };

      Reflect.defineProperty(component, 'type', {
        value: type,
        configurable: false,
        writable: false,
        enumerable: true,
      });

      makePartOfTree(component);
      makeRemote(component, id, remoteRoot);
      props.set(component, strict ? Object.freeze(initialProps) : initialProps);

      if (initialChildren) {
        const normalizedChildren: CanBeChild[] = [];

        for (const child of initialChildren) {
          const normalizedChild: CanBeChild =
            typeof child === 'string'
              ? remoteRoot.createText(child)
              : (child as any);

          normalizedChildren.push(normalizedChild);
          moveChildToContainer(component, normalizedChild);
        }

        children.set(
          component,
          strict ? Object.freeze(normalizedChildren) : normalizedChildren,
        );
      } else {
        children.set(component, strict ? Object.freeze([]) : []);
      }

      nodes.add(component);

      return (component as unknown) as RemoteComponent<typeof type, Root>;
    },
    createText(content = '') {
      const id = `${currentId++}`;

      const text: RemoteText<Root> = {
        kind: KIND_TEXT,
        get text() {
          return texts.get(text)!;
        },
        updateText: (newText) => updateText(text, newText),
        // Just satisfying the type definition, since we need to write
        // some properties manually.
        ...({} as any),
      };

      makePartOfTree(text);
      makeRemote(text, id, remoteRoot);
      texts.set(text, content);

      nodes.add(text);

      return text;
    },
    appendChild: (child) => appendChild(remoteRoot, child),
    removeChild: (child) => removeChild(remoteRoot, child),
    insertChildBefore: (child, before) =>
      insertChildBefore(remoteRoot, child, before),
    mount() {
      mounted = true;
      return Promise.resolve(
        channel(ACTION_MOUNT, children.get(remoteRoot)!.map(serialize)),
      );
    },
  };

  children.set(remoteRoot, []);

  return remoteRoot;

  function connected(element: CanBeChild) {
    return tops.get(element) === remoteRoot;
  }

  function allDescendants(
    element: CanBeChild,
    withEach: (item: CanBeChild) => void,
  ) {
    const recurse = (element: CanBeChild) => {
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
    element: Text | Component | Root,
    {
      remote,
      local,
    }: {
      remote(channel: RemoteChannel): void | Promise<void>;
      local(): void;
    },
  ) {
    if (mounted && (element === remoteRoot || connected(element as any))) {
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

  function updateText(text: Text, newText: string) {
    return perform(text, {
      remote: (channel) => channel(ACTION_UPDATE_TEXT, text.id, newText),
      local: () => texts.set(text, newText),
    });
  }

  function updateProps(component: Component, newProps: any) {
    // See notes above for why we treat `children` as a reserved prop.
    if (newProps.children) delete newProps.children;

    return perform(component, {
      remote: (channel) => channel(ACTION_UPDATE_PROPS, component.id, newProps),
      local: () => {
        const mergedProps = {...props.get(component), ...newProps};
        props.set(component, strict ? Object.freeze(mergedProps) : mergedProps);
      },
    });
  }

  function appendChild(container: HasChildren, child: CanBeChild | string) {
    const normalizedChild =
      typeof child === 'string' ? remoteRoot.createText(child) : child;

    if (!nodes.has(normalizedChild)) {
      throw new Error(
        `Cannot append a node that was not created by this Remote Root`,
      );
    }

    return perform(container, {
      remote: (channel) =>
        channel(
          ACTION_INSERT_CHILD,
          (container as any).id,
          container.children.length,
          serialize(normalizedChild),
        ),
      local: () => {
        moveChildToContainer(container, normalizedChild);

        const mergedChildren = [
          ...(children.get(container) ?? []),
          normalizedChild,
        ];

        children.set(
          container,
          strict ? Object.freeze(mergedChildren) : mergedChildren,
        );
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
  function removeChild(container: HasChildren, child: CanBeChild) {
    return perform(container, {
      remote: (channel) =>
        channel(
          ACTION_REMOVE_CHILD,
          (container as any).id,
          container.children.indexOf(child as any),
        ),
      local: () => {
        parents.delete(child);
        allDescendants(child, (descendant) =>
          tops.set(descendant, child as any),
        );

        const newChildren = [...(children.get(container) ?? [])];
        newChildren.splice(newChildren.indexOf(child), 1);
        children.set(
          container,
          strict ? Object.freeze(newChildren) : newChildren,
        );
      },
    });
  }

  function insertChildBefore(
    container: HasChildren,
    child: CanBeChild,
    before: CanBeChild,
  ) {
    if (!nodes.has(child)) {
      throw new Error(
        `Cannot insert a node that was not created by this Remote Root`,
      );
    }

    return perform(container, {
      remote: (channel) =>
        channel(
          ACTION_INSERT_CHILD,
          (container as any).id,
          container.children.indexOf(before as any),
          serialize(child),
        ),
      local: () => {
        moveChildToContainer(container, child);

        const newChildren = [...(children.get(container) || [])];
        newChildren.splice(newChildren.indexOf(before), 0, child);

        children.set(
          container,
          strict ? Object.freeze(newChildren) : newChildren,
        );
      },
    });
  }

  function moveChildToContainer(container: HasChildren, child: CanBeChild) {
    const newTop =
      container === remoteRoot ? remoteRoot : tops.get(container as any)!;

    tops.set(child, newTop);
    parents.set(child, container);
    allDescendants(child, (descendant) => tops.set(descendant, newTop));
  }

  function makePartOfTree(value: CanBeChild) {
    Reflect.defineProperty(value, 'parent', {
      get() {
        return parents.get(value);
      },
      configurable: true,
      enumerable: true,
    });

    Reflect.defineProperty(value, 'top', {
      get() {
        return tops.get(value);
      },
      configurable: true,
      enumerable: true,
    });
  }

  function serialize(value: Text | Component): Serialized<typeof value> {
    return 'text' in value
      ? {id: value.id, text: value.text}
      : {
          id: value.id,
          type: value.type,
          props: value.props,
          children: value.children.map((child) => serialize(child as any)),
        };
  }
}

function makeRemote<Root extends RemoteRoot<any, any>>(
  value: RemoteText<Root> | RemoteComponent<any, Root>,
  id: string,
  root: Root,
) {
  Reflect.defineProperty(value, 'id', {
    value: id,
    configurable: true,
    writable: false,
    enumerable: false,
  });

  Reflect.defineProperty(value, 'root', {
    value: root,
    configurable: true,
    writable: false,
    enumerable: false,
  });
}
