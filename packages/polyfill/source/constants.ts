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
export const IS_CONNECTED = Symbol('is_connected');

// @TODO remove explicit values
export const enum NodeType {
  NODE = 0,
  ELEMENT_NODE = 1,
  ATTRIBUTE_NODE = 2,
  TEXT_NODE = 3,
  CDATA_SECTION_NODE = 4,
  ENTITY_REFERENCE_NODE = 5,
  ENTITY_NODE = 6,
  PROCESSING_INSTRUCTION_NODE = 7,
  COMMENT_NODE = 8,
  DOCUMENT_NODE = 9,
  DOCUMENT_TYPE_NODE = 10,
  DOCUMENT_FRAGMENT_NODE = 11,
}

export const enum NamespaceURI {
  XHTML = 'http://www.w3.org/1999/xhtml',
  SVG = 'http://www.w3.org/2000/svg',
}
