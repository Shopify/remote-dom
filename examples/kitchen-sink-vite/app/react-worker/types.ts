import type {RemoteChannel} from '@remote-ui/core';

export type Endpoint = {
  render: (
    receiver: RemoteChannel,
    api: {getMessage: () => Promise<string>},
  ) => Promise<unknown>;
};
