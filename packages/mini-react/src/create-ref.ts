import type {RefObject} from './types';

export function createRef<T>(): RefObject<T> {
  return {current: null};
}
