import {
  ACTION_INSERT_CHILD as LEGACY_ACTION_INSERT_CHILD,
  ACTION_MOUNT as LEGACY_ACTION_MOUNT,
  ACTION_REMOVE_CHILD as LEGACY_ACTION_REMOVE_CHILD,
  ACTION_UPDATE_PROPS as LEGACY_ACTION_UPDATE_PROPS,
  ACTION_UPDATE_TEXT as LEGACY_ACTION_UPDATE_TEXT,
  KIND_COMPONENT as LEGACY_KIND_COMPONENT,
  KIND_FRAGMENT as LEGACY_KIND_FRAGMENT,
  KIND_TEXT as LEGACY_KIND_TEXT,
  type ActionArgumentMap as LegacyActionArgumentMap,
  type RemoteChannel as LegacyRemoteChannel,
  type RemoteComponentSerialization as LegacyRemoteComponentSerialization,
  type RemoteFragmentSerialization as LegacyRemoteFragmentSerialization,
  type RemoteTextSerialization as LegacyRemoteTextSerialization,
} from '@remote-ui/core';

import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  ROOT_ID,
  type RemoteCommentSerialization,
  type RemoteConnection,
  type RemoteElementSerialization,
  type RemoteMutationRecord,
  type RemoteNodeSerialization,
  type RemoteTextSerialization,
} from '@remote-dom/core';

export interface LegacyRemoteChannelElementMap {
  [key: string]: string;
}

export interface LegacyRemoteChannelOptions {
  /**
   * A map of element types to their corresponding remote-ui element types.
   */
  elements?: LegacyRemoteChannelElementMap;

  slotProps?: {
    /**
     * The element type to use for slots.
     */
    wrapper?: string;
  };
}

/**
 * Adapts a Remote DOM `RemoteConnection` object into a `remote-ui` `RemoteChannel`.
 * This allows you to use a Remote DOM receiver class on the host, even if the remote
 * environment is using `remote-ui`.
 *
 * @example
 * ```tsx
 * import {DOMRemoteReceiver} from '@remote-dom/core/receivers';
 * import {adaptToLegacyRemoteChannel} from '@remote-dom/compat';
 *
 * const receiver = new DOMRemoteReceiver();
 * const channel = adaptToLegacyRemoteChannel(receiver.connection);
 *
 * // Do something with the channel
 * sendChannelToRemoteEnvironment(channel);
 * ```
 */
export function adaptToLegacyRemoteChannel(
  connection: RemoteConnection,
  options?: LegacyRemoteChannelOptions,
): LegacyRemoteChannel {
  // child node list of a given parent
  const tree = new Map<string, {id: string; slot?: string}[]>();

  function mutate(records: RemoteMutationRecord[]) {
    for (const record of records) {
      const [mutationType, parentId] = record;

      switch (mutationType) {
        case MUTATION_TYPE_INSERT_CHILD: {
          const parentId = record[1];
          const node = record[2];
          const nextSiblingId = record[3];
          if (!tree.has(parentId)) {
            tree.set(parentId, []);
          }

          const siblings = tree.get(parentId)!;
          const index =
            nextSiblingId === undefined
              ? siblings.length
              : siblings.findIndex((child) => child.id === nextSiblingId);
          persistNode(parentId, node, index);
          break;
        }
        case MUTATION_TYPE_REMOVE_CHILD: {
          const index = record[2];
          removeNode(parentId, index);
          break;
        }
      }
    }

    connection.mutate(records);
  }

  function persistNode(
    parentId: string,
    node: RemoteNodeSerialization,
    index: number,
  ) {
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    const siblings = tree.get(parentId)!;
    siblings.splice(index, 0, {
      id: node.id,
      slot: 'attributes' in node ? node.attributes?.slot : undefined,
    });

    if ('children' in node && node.children) {
      for (const [childIndex, child] of node.children.entries()) {
        persistNode(node.id, child, childIndex);
      }
    }
  }

  function removeNode(parentId: string, id: string) {
    const siblings = tree.get(parentId);
    if (!siblings) {
      return;
    }
    const index = siblings?.findIndex((child) => child.id === id);
    if (index === -1) return;

    siblings.splice(index, 1);
    cleanupNode(id);
  }

  function cleanupNode(id: string) {
    const nodeChildren = tree.get(id);

    if (nodeChildren) {
      for (const child of nodeChildren) {
        cleanupNode(child.id);
      }

      tree.delete(id);
    }
  }

  return function remoteChannel<T extends keyof LegacyActionArgumentMap>(
    type: T,
    ...payload: LegacyActionArgumentMap[T]
  ) {
    switch (type) {
      case LEGACY_ACTION_MOUNT: {
        const [nodes] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_MOUNT];

        const records = nodes.map(
          (node) =>
            [
              MUTATION_TYPE_INSERT_CHILD,
              ROOT_ID,
              adaptLegacyNodeSerialization(node, options),
            ] satisfies RemoteMutationRecord,
        );

        mutate(records);

        break;
      }

      case LEGACY_ACTION_INSERT_CHILD: {
        const [parentId = ROOT_ID, index, child] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_INSERT_CHILD];

        const records = [];

        const siblings = tree.get(parentId) ?? [];
        const relevantSiblings = [...siblings];

        const existingChildIndex = relevantSiblings.findIndex(
          ({id}) => id === child.id,
        );

        if (existingChildIndex >= 0) {
          records.push([
            MUTATION_TYPE_REMOVE_CHILD,
            parentId,
            child.id,
          ] satisfies RemoteMutationRecord);

          relevantSiblings.splice(existingChildIndex, 1);
        }

        const nextSibling = relevantSiblings[index];

        records.push([
          MUTATION_TYPE_INSERT_CHILD,
          parentId,
          adaptLegacyNodeSerialization(child, options),
          nextSibling?.id,
        ] satisfies RemoteMutationRecord);

        mutate(records);

        break;
      }

      case LEGACY_ACTION_REMOVE_CHILD: {
        const [parentId = ROOT_ID, index] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_REMOVE_CHILD];
        const id = tree.get(parentId)?.[index]?.id;
        if (id === undefined) {
          return;
        }
        mutate([[MUTATION_TYPE_REMOVE_CHILD, parentId, id]]);

        break;
      }

      case LEGACY_ACTION_UPDATE_TEXT: {
        const [textId, text] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_TEXT];

        mutate([[MUTATION_TYPE_UPDATE_TEXT, textId, text]]);

        break;
      }

      case LEGACY_ACTION_UPDATE_PROPS: {
        const [id, props] =
          payload as LegacyActionArgumentMap[typeof LEGACY_ACTION_UPDATE_PROPS];
        const siblings = tree.get(id);

        const records = [];

        for (const [key, value] of Object.entries(props)) {
          const slotNodeId = siblings?.find(({slot}) => slot === key)?.id;

          if (isFragment(value)) {
            if (slotNodeId !== undefined) {
              records.push([
                MUTATION_TYPE_REMOVE_CHILD,
                id,
                slotNodeId,
              ] satisfies RemoteMutationRecord);
            }

            records.push([
              MUTATION_TYPE_INSERT_CHILD,
              id,
              adaptLegacyPropFragmentSerialization(key, value, options),
            ] satisfies RemoteMutationRecord);
          } else {
            if (slotNodeId !== undefined) {
              records.push([
                MUTATION_TYPE_REMOVE_CHILD,
                id,
                slotNodeId,
              ] satisfies RemoteMutationRecord);
            } else {
              records.push([
                MUTATION_TYPE_UPDATE_PROPERTY,
                id,
                key,
                value,
              ] satisfies RemoteMutationRecord);
            }
          }
        }

        mutate(records);

        break;
      }

      default:
        throw new Error(`Unsupported action type: ${type}`);
    }
  };
}

function adaptLegacyNodeSerialization(
  child:
    | LegacyRemoteComponentSerialization
    | LegacyRemoteTextSerialization
    | LegacyRemoteFragmentSerialization,
  options?: LegacyRemoteChannelOptions,
):
  | RemoteElementSerialization
  | RemoteTextSerialization
  | RemoteCommentSerialization {
  switch (child.kind) {
    case LEGACY_KIND_TEXT:
      return adaptLegacyTextSerialization(child);
    case LEGACY_KIND_COMPONENT:
      return adaptLegacyComponentSerialization(child, options);
    default:
      return {
        id: child.id,
        type: NODE_TYPE_COMMENT,
        data: 'added by remote-ui legacy adaptor to replace a fragment rendered as a child',
      };
  }
}

function adaptLegacyTextSerialization({
  id,
  text,
}: LegacyRemoteTextSerialization): RemoteTextSerialization {
  return {
    id,
    type: NODE_TYPE_TEXT,
    data: text,
  };
}

function adaptLegacyComponentSerialization(
  {id, type, props, children}: LegacyRemoteComponentSerialization,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization {
  const element = options?.elements?.[type] ?? type;

  const [fragments, properties] = adaptFragmentsInProps(props);

  return {
    id,
    type: NODE_TYPE_ELEMENT,
    element,
    properties,
    children: [
      ...children.map((child) => {
        return adaptLegacyNodeSerialization(child, options);
      }),
      ...adaptLegacyFragmentsSerialization(fragments, options),
    ],
  };
}

function adaptFragmentsInProps(
  props: Record<string, unknown>,
): [
  fragments: Record<string, LegacyRemoteFragmentSerialization>,
  properties: Record<string, unknown>,
] {
  const fragments: Record<string, LegacyRemoteFragmentSerialization> = {};
  const properties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (isFragment(value)) {
      fragments[key] = value;
    } else {
      properties[key] = value;
    }
  }

  return [fragments, properties];
}

function isFragment(prop: unknown): prop is LegacyRemoteFragmentSerialization {
  return (
    prop != null &&
    typeof prop === 'object' &&
    'kind' in prop &&
    prop.kind === LEGACY_KIND_FRAGMENT
  );
}

function adaptLegacyFragmentsSerialization(
  fragments: Record<string, LegacyRemoteFragmentSerialization>,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization[] {
  return Object.entries(fragments).map(([slot, fragment]) => {
    return adaptLegacyPropFragmentSerialization(slot, fragment, options);
  });
}

function adaptLegacyPropFragmentSerialization(
  slot: string,
  fragment: LegacyRemoteFragmentSerialization,
  options?: LegacyRemoteChannelOptions,
): RemoteElementSerialization {
  return {
    id: fragment.id,
    element: options?.slotProps?.wrapper ?? 'remote-fragment',
    attributes: {
      slot,
    },
    type: NODE_TYPE_ELEMENT,
    children: fragment.children.map((child) => {
      return adaptLegacyNodeSerialization(child, options);
    }),
  };
}
