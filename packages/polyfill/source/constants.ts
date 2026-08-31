export const NAME = Symbol('name');
export const VALUE = Symbol('value');
export const NS = Symbol('ns');
export const OWNER_ELEMENT = Symbol('owner');
export const OWNER_DOCUMENT = Symbol('owner_document');
export const ATTRIBUTES = Symbol('attributes');
export const PREV = Symbol('prev');
export const NEXT = Symbol('next');
export const CHILD = Symbol('child');
export const PARENT = Symbol('parent');
export const DATA = Symbol('data');
export const USER_PROPERTIES = Symbol('user_properties');
export const LISTENERS = Symbol('listeners');
export const IS_TRUSTED = Symbol('isTrusted');
export const PATH = Symbol('path');
export const STOP_IMMEDIATE_PROPAGATION = Symbol('stop_immediate_propagation');
export const CONTENT = Symbol('content');
export const HOOKS = Symbol('hooks');
export const EXTENSIONS = Symbol('extensions');
export const HOOKS_DISPATCH = Symbol('hooks_dispatch');
export const IS_CONNECTED = Symbol('is_connected');

export const NODE_TYPE_NODE = 0;
export const NODE_TYPE_ELEMENT = 1;
export const NODE_TYPE_ATTRIBUTE = 2;
export const NODE_TYPE_TEXT = 3;
export const NODE_TYPE_CDATA_SECTION = 4;
export const NODE_TYPE_ENTITY_REFERENCE = 5;
export const NODE_TYPE_ENTITY = 6;
export const NODE_TYPE_PROCESSING_INSTRUCTION = 7;
export const NODE_TYPE_COMMENT = 8;
export const NODE_TYPE_DOCUMENT = 9;
export const NODE_TYPE_DOCUMENT_TYPE = 10;
export const NODE_TYPE_DOCUMENT_FRAGMENT = 11;

export type NodeType = number;

export const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export type NamespaceURI = typeof HTML_NAMESPACE | typeof SVG_NAMESPACE;
