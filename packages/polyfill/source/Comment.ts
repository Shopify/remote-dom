import {NAME} from './constants.ts';
import {CharacterData} from './CharacterData.ts';

export class Comment extends CharacterData {
  nodeType = 8;
  [NAME] = '#comment';
}
