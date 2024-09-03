import {type Endpoint} from '@remote-ui/rpc';
import {
  KIND_COMPONENT,
  KIND_FRAGMENT,
  KIND_TEXT,
  RemoteComponentSerialization,
  RemoteFragmentSerialization,
  RemoteTextSerialization,
  createRemoteChannel,
  retain,
  release, // todo
} from '@remote-ui/core';
import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_PROPERTY,
  MUTATION_TYPE_UPDATE_TEXT,
  NODE_TYPE_ELEMENT,
  RemoteElementSerialization,
  RemoteMutationRecordInsertChild,
  RemoteMutationRecordRemoveChild,
  RemoteMutationRecordUpdateProperty,
  RemoteMutationRecordUpdateText,
  RemoteNodeSerialization,
} from '@remote-dom/core';
import {LegacySandboxAPI, SandboxAPI} from '../types';
import {Thread} from '@quilted/threads';

export function wrapRemoteUiSandbox(
  sandbox: Endpoint<LegacySandboxAPI>,
): Pick<Thread<SandboxAPI>, 'imports'> {
  return {
    imports: {
      async render(connection, api) {
        function convertSerialization<
          T extends
            | RemoteTextSerialization
            | RemoteComponentSerialization
            | RemoteFragmentSerialization,
        >(node: T): RemoteElementSerialization | RemoteNodeSerialization {
          switch (node.kind) {
            case KIND_COMPONENT:
              const properties: Record<string, any> = {};
              const children = node.children.map(convertSerialization);
              for (const prop in node.props) {
                const value = node.props[prop];
                if (
                  typeof value === 'object' &&
                  value &&
                  'kind' in value &&
                  'id' in value
                ) {
                  const child = convertSerialization(
                    value,
                  ) as RemoteElementSerialization;
                  child.properties!.slot = prop;
                  children.push(child);
                } else {
                  properties[prop] = value;
                  retain(value);
                }
              }
              return {
                type: NODE_TYPE_ELEMENT,
                id: node.id,
                element:
                  'ui' + node.type.replace(/([A-Z])/g, '-$1').toLowerCase(),
                properties: properties,
                children,
              } satisfies RemoteElementSerialization;
            case KIND_FRAGMENT:
              return {
                type: NODE_TYPE_ELEMENT,
                id: node.id,
                element: 'remote-fragment',
                properties: {},
                children: node.children.map(convertSerialization),
              } satisfies RemoteElementSerialization;
            case KIND_TEXT:
              return {
                type: 3,
                id: node.id,
                data: node.text,
              };
          }
        }

        const channel = createRemoteChannel({
          mount(nodes) {
            connection.mutate(
              nodes.map(
                (node, index) =>
                  [
                    MUTATION_TYPE_INSERT_CHILD,
                    '~',
                    convertSerialization(node),
                    index,
                  ] satisfies RemoteMutationRecordInsertChild,
              ),
            );
          },
          insertChild(node, index, child) {
            connection.mutate([
              [
                MUTATION_TYPE_INSERT_CHILD,
                node!,
                convertSerialization(child),
                index,
              ] satisfies RemoteMutationRecordInsertChild,
            ]);
          },
          removeChild(node, index) {
            connection.mutate([
              [
                MUTATION_TYPE_REMOVE_CHILD,
                node!,
                index,
              ] satisfies RemoteMutationRecordRemoveChild,
            ]);
          },
          updateProps(node, props) {
            retain(props, {deep: true});
            connection.mutate(
              Object.entries(props).map(
                ([property, value]) =>
                  [
                    MUTATION_TYPE_UPDATE_PROPERTY,
                    node!,
                    property,
                    value,
                  ] satisfies RemoteMutationRecordUpdateProperty,
              ),
            );
          },
          updateText(node, text) {
            connection.mutate([
              [
                MUTATION_TYPE_UPDATE_TEXT,
                node!,
                text,
              ] satisfies RemoteMutationRecordUpdateText,
            ]);
          },
        });
        return sandbox.call.render(channel, api);
      },
    },
  };
}
