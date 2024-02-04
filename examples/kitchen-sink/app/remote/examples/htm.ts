import {html} from '@remote-dom/core/html';

import type {RenderAPI} from '../../types.ts';
import type {Modal, Text} from '../elements.ts';

export function renderUsingHTM(root: Element, api: RenderAPI) {
  let count = 0;

  function handlePress() {
    updateCount(count + 1);
  }

  function handleClose() {
    if (count > 0) {
      api.alert(`You clicked ${count} times!`);
    }

    updateCount(0);
  }

  function updateCount(newCount: number) {
    count = newCount;
    countText.textContent = String(count);
  }

  function handlePrimaryAction() {
    modal.close();
  }

  const countText = html`
    <ui-text emphasis>${count}</ui-text>
  ` satisfies InstanceType<typeof Text>;

  const modal = html`
    <ui-modal slot="modal" onClose=${handleClose}>
      <ui-text>Click count: <ui-text emphasis>${countText}</ui-text></ui-text>
      <ui-button onPress=${handlePress}>Click me!</ui-button>
      <ui-button slot="primaryAction" onPress=${handlePrimaryAction}>
        Close
      </ui-button>
    </ui-modal>
  ` satisfies InstanceType<typeof Modal>;

  const stack = html`
    <ui-stack spacing>
      <ui-text>
        Rendering example: <ui-text emphasis>${api.example}</ui-text>
      </ui-text>
      <ui-text>
        Rendering in sandbox: <ui-text emphasis>${api.sandbox}</ui-text>
      </ui-text>

      <ui-button> Open modal ${modal} </ui-button>
    </ui-stack>
  ` satisfies HTMLElement;

  root.append(stack);
}
