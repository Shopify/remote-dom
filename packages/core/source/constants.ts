export const NODE_TYPE_ELEMENT = 1;
export const NODE_TYPE_TEXT = 3;
export const NODE_TYPE_COMMENT = 8;
export const NODE_TYPE_ROOT = 9;

export const MUTATION_TYPE_INSERT_CHILD = 0;
export const MUTATION_TYPE_REMOVE_CHILD = 1;
export const MUTATION_TYPE_UPDATE_TEXT = 2;
export const MUTATION_TYPE_UPDATE_PROPERTY = 3;

export const UPDATE_PROPERTY_TYPE_PROPERTY = 1;
export const UPDATE_PROPERTY_TYPE_ATTRIBUTE = 2;
export const UPDATE_PROPERTY_TYPE_EVENT_LISTENER = 3;

export const REMOTE_ID = Symbol.for('remote.id');
export const REMOTE_CONNECTION = Symbol.for('remote.connection');
export const REMOTE_PROPERTIES = Symbol.for('remote.properties');
export const REMOTE_ATTRIBUTES = Symbol.for('remote.attributes');
export const REMOTE_EVENT_LISTENERS = Symbol.for('remote.event-listeners');
export const ROOT_ID = '~';
