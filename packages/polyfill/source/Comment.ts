import {NAME, NODE_TYPE_COMMENT, type NodeType} from './constants.ts';
import {CharacterData} from './CharacterData.ts';

export class Comment extends CharacterData {
  nodeType: NodeType = NODE_TYPE_COMMENT;
  [NAME] = '#comment';
}
