import type {RenderApi} from '../../types.ts';

export function renderUsingVanillaDOM(root: Element, api: RenderApi) {
  let value = '';

  const stack = document.createElement('ui-stack');
  stack.spacing = true;

  const textField = document.createElement('ui-text-field');
  textField.label =
    'Message for remote environment (rendered using vanilla DOM)';
  textField.onChange = function onChange(newValue) {
    value = newValue;
  };

  const button = document.createElement('ui-button');
  button.textContent = 'Show alert';
  button.onPress = async function onPress() {
    await api.alert(
      `Current value in remote sandbox: ${JSON.stringify(value)}`,
    );
  };

  stack.append(textField);
  stack.append(button);
  root.append(stack);
}
