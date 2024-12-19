import '../../polyfill';
import './MutationObserverMock';
import {MutationObserverMock} from './MutationObserverMock';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {RemoteMutationObserver} from '../RemoteMutationObserver';
import {
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
} from '../../constants';

let observer: RemoteMutationObserver & MutationObserverMock;
let observedRoot: HTMLDivElement;

let node1: Node;
let node2: Node;
let node3: Node;

const mockedConnection = {
  mutate: vi.fn(),
  call: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();

  observer = new RemoteMutationObserver(
    mockedConnection,
  ) as RemoteMutationObserver & MutationObserverMock;

  observedRoot = div();
  node1 = div();
  node2 = div();
  node3 = div();
});

interface TestMutation {
  addedNodes?: Node[];
  removedNodes?: Node[];
  previousSibling?: Node;
}

function createMutationRecord(mutation: TestMutation): MutationRecord {
  const {addedNodes = [], removedNodes = [], previousSibling} = mutation;

  return {
    type: 'childList',
    addedNodes: addedNodes as never,
    removedNodes: removedNodes as never,
    previousSibling: previousSibling ?? null,
    target: observedRoot,
    attributeName: null,
    attributeNamespace: null,
    nextSibling: null,
    oldValue: null,
  };
}

const div = () => document.createElement('div');

const insert = (node: Node, after?: Node) =>
  createMutationRecord({
    addedNodes: [node],
    previousSibling: after,
  });

const remove = (node: Node, after?: Node) =>
  createMutationRecord({
    removedNodes: [node],
    previousSibling: after,
  });

const after = (after: Node) => ({
  remove: (node: Node) => remove(node, after),
  insert: (node: Node) => insert(node, after),
});

const atStart = {
  remove: (node: Node) => remove(node),
  insert: (node: Node) => insert(node),
};

function givenFinalNodes(...nodes: Node[]) {
  type ExpectedRemoteMutation = [type: number, index: number];

  observedRoot.append(...nodes);

  return {
    createdByMutations(...mutations: MutationRecord[]) {
      observer.emitMutation(mutations);

      return {
        expectRemoteMutations(...expected: ExpectedRemoteMutation[]) {
          const remoteMutations = expected.map(([type, index]) =>
            type === MUTATION_TYPE_INSERT_CHILD
              ? [type, expect.anything(), expect.anything(), index]
              : [type, expect.anything(), index],
          );

          expect(mockedConnection.mutate).toHaveBeenCalledWith([
            ...remoteMutations,
          ]);
        },
      };
    },
  };
}

describe('RemoteMutationObserver', () => {
  it('orders structural mutations by their index', () => {
    givenFinalNodes(node1, node2)
      .createdByMutations(after(node2).remove(node3), atStart.insert(node1))
      .expectRemoteMutations(
        [MUTATION_TYPE_INSERT_CHILD, 0],
        [MUTATION_TYPE_REMOVE_CHILD, 2],
      );
  });
});
