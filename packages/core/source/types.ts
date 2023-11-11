import type {
  NODE_TYPE_ELEMENT,
  NODE_TYPE_TEXT,
  NODE_TYPE_COMMENT,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from './constants.ts';

export type RemoteMutationRecordInsertChild = [
  type: typeof MUTATION_TYPE_INSERT_CHILD,
  id: string,
  child:
    | RemoteTextSerialization
    | RemoteCommentSerialization
    | RemoteElementSerialization,
  index: number,
];

export type RemoteMutationRecordRemoveChild = [
  type: typeof MUTATION_TYPE_REMOVE_CHILD,
  id: string,
  index: number,
];

export type RemoteMutationRecordUpdateText = [
  type: typeof MUTATION_TYPE_UPDATE_TEXT,
  id: string,
  text: string,
];

export type RemoteMutationRecordUpdateProperty = [
  type: typeof MUTATION_TYPE_UPDATE_PROPERTY,
  id: string,
  property: string,
  value: unknown,
];

export type RemoteMutationRecord =
  | RemoteMutationRecordInsertChild
  | RemoteMutationRecordRemoveChild
  | RemoteMutationRecordUpdateText
  | RemoteMutationRecordUpdateProperty;

export type RemoteMutationCallback = (
  records: readonly RemoteMutationRecord[],
) => void | Promise<void>;

export interface RemoteElementSerialization {
  readonly id: string;
  readonly type: typeof NODE_TYPE_ELEMENT;
  readonly element: string;
  readonly properties?: Record<string, unknown>;
  readonly children: readonly (
    | RemoteElementSerialization
    | RemoteTextSerialization
    | RemoteCommentSerialization
  )[];
}

export interface RemoteTextSerialization {
  readonly id: string;
  readonly type: typeof NODE_TYPE_TEXT;
  readonly data: string;
}

export interface RemoteCommentSerialization {
  readonly id: string;
  readonly type: typeof NODE_TYPE_COMMENT;
  readonly data: string;
}

export type RemoteNodeSerialization =
  | RemoteTextSerialization
  | RemoteCommentSerialization
  | RemoteElementSerialization;
