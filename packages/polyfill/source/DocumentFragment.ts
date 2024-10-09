import {NAME, NodeType} from './constants.ts';
import {ParentNode} from './ParentNode.ts';

export class DocumentFragment extends ParentNode {
  nodeType = NodeType.DOCUMENT_FRAGMENT_NODE;
  [NAME] = '#document-fragment';
}
