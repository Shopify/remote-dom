export {
  createRemoteMutationCallback,
  type RemoteMutationHandler,
} from './callback.ts';

export * from './types.ts';
export {
  ROOT_ID,
  REMOTE_ID,
  REMOTE_CALLBACK,
  REMOTE_PROPERTIES,
  NODE_TYPE_COMMENT,
  NODE_TYPE_ELEMENT,
  NODE_TYPE_ROOT,
  NODE_TYPE_TEXT,
  MUTATION_TYPE_INSERT_CHILD,
  MUTATION_TYPE_REMOVE_CHILD,
  MUTATION_TYPE_UPDATE_TEXT,
  MUTATION_TYPE_UPDATE_PROPERTY,
} from './constants.ts';
