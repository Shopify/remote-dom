import {
  NAME,
  OWNER_DOCUMENT,
  NODE_TYPE_DOCUMENT_FRAGMENT,
  type NodeType,
} from './constants.ts';
import {ParentNode} from './ParentNode.ts';
import {getElementById as findElementById} from './shared.ts';

export class DocumentFragment extends ParentNode {
  nodeType: NodeType = NODE_TYPE_DOCUMENT_FRAGMENT;
  [NAME] = '#document-fragment';
  [OWNER_DOCUMENT] = (typeof window !== 'undefined'
    ? window.document
    : null) as any;

  getElementById(elementId: string) {
    return findElementById(this, elementId);
  }
}
