export interface RemoteChild {
  readonly __remote: unique symbol;
}

export interface RemoteComponentMap {
  [key: string]: [{}, string | never | RemoteChild];
}
