import type {Element} from './Element.ts';

const NativeFormData = globalThis.FormData;

export function FormData(form?: Element) {
  const data = new NativeFormData();

  if (form) {
    for (const control of form.querySelectorAll('[name]')) {
      const name = control.getAttribute('name');
      const type = String(
        control.type ?? control.getAttribute('type') ?? '',
      ).toLowerCase();
      const disabled = control.disabled ?? control.hasAttribute('disabled');

      if (
        !name ||
        disabled ||
        control.localName.toLowerCase() === 'button' ||
        type === 'button' ||
        type === 'image' ||
        type === 'reset' ||
        type === 'submit' ||
        ('checked' in control &&
          !(control.checked ?? control.hasAttribute('checked')))
      ) {
        continue;
      }

      data.append(name, control.value ?? control.getAttribute('value') ?? '');
    }
  }

  return data;
}

if (NativeFormData) FormData.prototype = NativeFormData.prototype;
