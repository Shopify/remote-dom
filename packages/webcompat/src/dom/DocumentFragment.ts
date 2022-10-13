import {NAME, NodeType} from './constants';
import {ParentNode} from './ParentNode';

export class DocumentFragment extends ParentNode {
  nodeType = NodeType.DOCUMENT_FRAGMENT_NODE;
  [NAME] = '#document-fragment';
}
