import {html} from '@remote-dom/core/html';
import type {RenderAPI} from '../../types.ts';

export function renderUsingHTM(root: Element, api: RenderAPI) {
  let value = '';

  const stack = html`
    <ui-stack spacing>
      <ui-text-field
        label="Message for remote environment (rendered using htm)"
        onChange=${function onChange(newValue: string) {
          value = newValue;
        }}
      />
      <ui-button
        onPress=${async function onPress() {
          await api.alert(
            `Current value in remote sandbox: ${JSON.stringify(value)}`,
          );
        }}
      >
        Show alert
      </ui-button>
    </ui-stack>
  ` satisfies HTMLElement;

  root.append(stack);
}
