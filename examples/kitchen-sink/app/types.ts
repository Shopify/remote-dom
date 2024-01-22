import type {RemoteConnection} from '@remote-dom/core';

export type RenderFramework = 'vanilla' | 'htm' | 'preact' | 'svelte';
export type RenderSandbox = 'iframe' | 'worker';

export interface RenderApi {
  sandbox: RenderSandbox;
  framework: RenderFramework;
  alert(content: string): Promise<void>;
}

export interface SandboxApi {
  render(connection: RemoteConnection, api: RenderApi): Promise<unknown>;
}

// Components

export interface ButtonProperties {
  onPress?(): void;
}

export interface StackProperties {
  spacing?: boolean;
}

export interface TextFieldProperties {
  label?: string;
  value?: string;
  onChange?(value: string): void;
}
