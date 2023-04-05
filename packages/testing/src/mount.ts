import {createRemoteRoot, isRemoteText} from '@remote-ui/core';
import type {RemoteRoot, RemoteChild} from '@remote-ui/core';

import {nodeName, nodeChildToString} from './print';
import {Node, RootNode} from './types';

const IS_NODE = Symbol.for('RemoteUiTesting.Node');

export function createTestRoot() {
  return createRemoteRoot<any, any>(() => {});
}

export function mount<Root extends RemoteRoot<any, any> = RemoteRoot<any, any>>(
  run: (root: Root) => void,
  root: Root = createTestRoot() as any,
) {
  let acting = false;
  let mounted = true;
  let rootNode!: Node<unknown>;

  act(() => {
    run(root);
  });

  const rootApi: RootNode<unknown> = new Proxy(
    {
      act,
      unmount,
    },
    {
      get(target, key, receiver) {
        if (Reflect.ownKeys(target).includes(key)) {
          return Reflect.get(target, key, receiver);
        }

        return withRootNode((rootNode) => Reflect.get(rootNode, key));
      },
    },
  ) as any;

  return rootApi;

  function createNode<Props>({
    type,
    props,
    instance,
    children,
  }: Pick<
    Node<Props>,
    'type' | 'props' | 'instance' | 'children'
  >): Node<Props> {
    const descendants = children.flatMap(getDescendants);

    function getDescendants(child: typeof children[number]): typeof children {
      return [
        child,
        ...(typeof child === 'string'
          ? []
          : child.children.flatMap(getDescendants)),
      ];
    }

    const find: Node<Props>['find'] = (type, props) =>
      (descendants.find(
        (element) =>
          isNode(element) &&
          element.type === type &&
          (props == null ||
            equalSubset(props, element.props as Record<string, unknown>)),
      ) as any) ?? null;

    const node: Node<Props> & {[IS_NODE]: true} = {
      [IS_NODE]: true,
      type,
      props,
      instance,
      get text() {
        return children.reduce<string>(
          (text, child) =>
            `${text}${typeof child === 'string' ? child : child.text}`,
          '',
        );
      },
      prop: (key) => props[key],
      is: (checkType) => type === checkType,

      find,
      findAll: (type, props) =>
        descendants.filter(
          (element) =>
            isNode(element) &&
            element.type === type &&
            (props == null ||
              equalSubset(props, element.props as Record<string, unknown>)),
        ) as any,

      findWhere: (predicate) =>
        (descendants.find(
          (element) => isNode(element) && predicate(element),
        ) as any) ?? null,

      findAllWhere: (predicate) =>
        descendants.filter(
          (element) => isNode(element) && predicate(element),
        ) as any,

      trigger: (prop, ...args) =>
        act(
          () => {
            const propValue = props[prop];

            if (propValue == null) {
              throw new Error(
                `Attempted to call prop ${String(
                  prop,
                )} but it was not defined.`,
              );
            }

            return (propValue as any)(...(args as any[]));
          },
          {eager: true},
        ),

      triggerKeypath: (keypath: string, ...args: unknown[]) =>
        act(
          () => {
            const parts = keypath.split(/[.[\]]/g).filter(Boolean);

            let currentProp: any = props;
            const currentKeypath: string[] = [];

            for (const part of parts) {
              if (currentProp == null || typeof currentProp !== 'object') {
                throw new Error(
                  `Attempted to access field keypath '${currentKeypath.join(
                    '.',
                  )}', but it was not an object.`,
                );
              }

              currentProp = currentProp[part];
              currentKeypath.push(part);
            }

            if (typeof currentProp !== 'function') {
              throw new Error(
                `Value at keypath '${keypath}' is not a function.`,
              );
            }

            return currentProp(...args);
          },
          {eager: true},
        ),

      children,
      descendants,
      debug: (options) => nodeChildToString(node, options),
      toString: () => `<${nodeName(node)} />`,
    };

    return node;
  }

  function unmount() {
    if (!mounted) {
      throw new Error(
        'You attempted to unmount a node that was already unmounted',
      );
    }

    mounted = false;
  }

  // Currently, we run the actions directly, so act isn’t actually flushing
  // updates or anything like that. In the future, we could use the fact that
  // we force all actions to be nested in here to make other guarantees about
  // how the updates have been flushed to the passed `root` (right now, we
  // treat that root as a "noop").
  function act<T>(action: () => T, {update = true, eager = false} = {}): T {
    const performUpdate = update ? updateRootNode : noop;

    if (acting) {
      return action();
    }

    acting = true;

    const afterResolve = () => {
      performUpdate();
      acting = false;
      return result;
    };

    const result = action();

    if (isPromise(result)) {
      if (eager) {
        performUpdate();

        return act(() => Promise.resolve(result).then(() => {})).then(
          afterResolve,
        ) as any;
      } else {
        return Promise.resolve(result).then(afterResolve) as any;
      }
    }

    return afterResolve();
  }

  function createNodeFromRemoteChild(
    child: RemoteChild<Root>,
  ): Node<unknown>['children'][number] {
    return isRemoteText(child)
      ? child.text
      : createNode({
          type: child.type,
          props: {...(child.props as any)},
          instance: child,
          children: child.children.map(createNodeFromRemoteChild),
        });
  }

  function updateRootNode() {
    rootNode = createNode<unknown>({
      type: null,
      props: {},
      children: root.children.map((child) =>
        createNodeFromRemoteChild(child as any),
      ),
      instance: root,
    });
  }

  function withRootNode<T>(perform: (node: Node<unknown>) => T) {
    if (!mounted) {
      throw new Error(
        'Attempted to operate on a mounted tree, but it is not mounted. Did you forget to call .mount()? If not, have you already called .unmount()?',
      );
    }

    return perform(rootNode!);
  }
}

export function isNode<Props = unknown>(
  maybeNode: unknown,
): maybeNode is Node<Props> {
  return maybeNode != null && (maybeNode as any)[IS_NODE];
}

function isPromise<T>(promise: unknown): promise is Promise<T> {
  return typeof (promise as any)?.then === 'function';
}

function equalSubset(
  subset: Record<string, unknown>,
  full: Record<string, unknown>,
) {
  return Object.keys(subset).every(
    (key) => key in full && full[key] === subset[key],
  );
}

function noop() {}
