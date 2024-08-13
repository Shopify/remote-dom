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
export type RenderExample =
  | 'vanilla'
  | 'htm'
  | 'preact'
  | 'react'
  | 'react-dom'
  | 'svelte'
  | 'vue';

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
   * Shows a modal alert to the user. Resolves when the user has dismissed the
   * alert.
   */
  alert(content: string): Promise<void>;
}

/**
 *
 */
export interface SandboxAPI {
  render(connection: RemoteConnection, api: RenderAPI): Promise<unknown>;
}

// These property and method types will be used by both the host and remote environments.
// They will be used to describe the properties that are available on the elements that can
// be synchronized between the two environments.

/**
 * A `Text` element renders a styled string of text.
 */
export interface TextProperties {
  /**
   * Whether the text should be emphasized.
   */
  emphasis?: boolean;
}

/**
 * A `Button` element renders a styled button that can be pressed by the user.
 */
export interface ButtonProperties {
  /**
   * A callback to run when the button is pressed. In the DOM environment created by
   * Remote DOM, this property can be set using `addEventListener('press')`.
   */
  onPress?(): void;
}

/**
 * A `Modal` element renders a dialog that interrupts the user’s workflow, and
 * must be dismissed.
 */
export interface ModalProperties {
  /**
   * A callback to run when the modal is closed. In the DOM environment created by
   * Remote DOM, this property can be set using `addEventListener('press')`.
   */
  onClose?(): void;
}

export interface ModalMethods {
  /**
   * Opens the modal.
   */
  open(): void;

  /**
   * Closes the modal.
   */
  close(): void;
}

/**
 * A `Stack` element renders children along the block axis, with optional spacing.
 */
export interface StackProperties {
  /**
   * Whether children should have space between them.
   */
  spacing?: boolean;
}
