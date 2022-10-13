import {NAME} from './constants';
import {CharacterData} from './CharacterData';

export class Comment extends CharacterData {
  nodeType = 8;
  [NAME] = '#comment';
}
