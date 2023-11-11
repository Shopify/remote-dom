import type {RemoteMutationCallback} from '@remote-dom/core';

export type RenderFramework = 'vanilla' | 'htm';
export type RenderSandbox = 'iframe' | 'worker';

export interface RenderApi {
  sandbox: RenderSandbox;
  framework: RenderFramework;
  alert(content: string): Promise<void>;
}

export interface SandboxApi {
  render(callback: RemoteMutationCallback, api: RenderApi): Promise<unknown>;
}
