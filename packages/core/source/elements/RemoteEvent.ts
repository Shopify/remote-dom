export class RemoteEvent<
  Detail = unknown,
  Result = unknown,
> extends CustomEvent<Detail> {
  readonly resolved = false;
  readonly result?: Result;

  constructor(type: string, options?: CustomEventInit<Detail>) {
    super(type, options);
  }

  resolve(resolver: (detail: Detail) => Result | Promise<Result>) {
    (this as any).resolved = true;
    (this as any).result = resolver(this.detail);
  }
}
