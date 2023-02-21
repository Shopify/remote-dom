import { type RemoteChannel } from "@remote-ui/core";

export type Api = {
  getMessage(): Promise<string>;
}
export type EndpointApi = {
  render(receiver: RemoteChannel, api: Api): Promise<unknown>
}
