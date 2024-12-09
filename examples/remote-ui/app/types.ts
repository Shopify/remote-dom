// These property and method types will be used by both the host and remote environments.
// They will be used to describe the properties that are available on the elements that can
// be synchronized between the two environments.

import {RemoteChannel, RemoteFragment} from '@remote-ui/core';

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

  modal?: RemoteFragment;
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

  primaryAction?: RemoteFragment;
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

export interface EndpointApi {
  render(channel: RemoteChannel, api: RenderAPI): Promise<void>;
}

export interface RenderAPI {
  closeModal(): void;
  showAlert(message: string): void;
}
