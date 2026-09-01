import {NAME, NODE_TYPE_TEXT, type NodeType} from './constants.ts';
import {CharacterData} from './CharacterData.ts';

export class Text extends CharacterData {
  nodeType: NodeType = NODE_TYPE_TEXT;
  [NAME] = '#text';
}
