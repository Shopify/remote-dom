import {NAME, NodeType} from './constants.ts';
import {CharacterData} from './CharacterData.ts';

export class Comment extends CharacterData {
  nodeType: NodeType = NodeType.COMMENT_NODE;
  [NAME] = '#comment';
}
