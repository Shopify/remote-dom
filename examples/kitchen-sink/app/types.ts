import type {RemoteConnection} from '@remote-dom/core';

/**
 * Describes the technology used to sandbox the “remote” code, so that it does
 * not have access to the DOM of the “host” page.
 */
export type RenderSandbox =
  /**
   * The remote code is executed in an `<iframe>`.
   */
  | 'iframe'
  /**
   * The remote code is executed in a web worker.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
   */
  | 'worker';

/**
 * Describes the example used to render the UI in the sandboxed environment.
 * Each item in this list should have a corresponding example in the `app/examples`
 */
export type RenderExample = 'vanilla' | 'htm' | 'preact' | 'svelte' | 'vue';

/**
 * The object that the “host” page will pass to the “remote” environment. This
 * object could contain any information you like; the library we’re using
 * to create a sandboxed “remote” environment, `@quilted/threads`, supports
 * passing functions, objects, and other JavaScript types between environments.
 */
export interface RenderAPI {
  /**
   * Which sandboxing technology was used to execute our code?
   */
  sandbox: RenderSandbox;

  /**
   * Which example is being used to render the sandboxed UI?
   */
  example: RenderExample;

  /**
   * TODO
   */
  alert(content: string): Promise<void>;
}

export interface SandboxAPI {
  render(connection: RemoteConnection, api: RenderAPI): Promise<unknown>;
}

// Components

/**
 *
 */
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
