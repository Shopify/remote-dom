import {NAME, NodeType} from './constants';
import {CharacterData} from './CharacterData';

export class Text extends CharacterData {
  nodeType = NodeType.TEXT_NODE;
  [NAME] = '#text';
}
