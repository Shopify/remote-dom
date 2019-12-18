export const ANY_CHILD = Symbol('RemoteUi.AnyChild');

export type RemoteChild = typeof ANY_CHILD;

export interface RemoteComponentMap {
  [key: string]: [{}, RemoteChild];
}
