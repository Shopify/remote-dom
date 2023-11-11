import {html} from '@remote-dom/core/html';
import type {RenderApi} from '../../types.ts';

export function renderUsingHtm(root: Element, api: RenderApi) {
  let value = '';

  const stack = html<HTMLElement>`
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
  `;

  root.append(stack);
}
