export function createRemoteComponent<T extends string>(name: T): T {
  return name as any;
}
