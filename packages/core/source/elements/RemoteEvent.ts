export class RemoteEvent<
  Detail = unknown,
  Result = unknown,
> extends CustomEvent<Detail> {
  readonly response?: Result;

  respondWith(response: Result) {
    (this as any).response = response;
  }
}
