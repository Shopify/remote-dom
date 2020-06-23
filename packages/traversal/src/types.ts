import type {RemoteRoot, RemoteComponent} from '@remote-ui/core';

export type {RemoteComponent};

export type RemoteElement = RemoteRoot<any, any> | RemoteComponent<string, any>;
