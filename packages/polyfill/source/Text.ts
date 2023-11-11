import {NAME, NodeType} from './constants.ts';
import {CharacterData} from './CharacterData.ts';

export class Text extends CharacterData {
  nodeType = NodeType.TEXT_NODE;
  [NAME] = '#text';
}
