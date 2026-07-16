import type {Element} from './Element.ts';

const NativeFormData = globalThis.FormData;

export function FormData(form?: Element) {
  const data = new NativeFormData();

  if (form) {
    for (const control of form.querySelectorAll('[name]')) {
      const name = control.getAttribute('name');
      if (!name) continue;

      const disabled = control.disabled ?? control.hasAttribute('disabled');
      if (disabled) continue;
      if (control.localName.toLowerCase() === 'button') continue;

      const type = String(
        control.type ?? control.getAttribute('type') ?? '',
      ).toLowerCase();
      if (type === 'button') continue;
      if (type === 'image') continue;
      if (type === 'reset') continue;
      if (type === 'submit') continue;

      if (
        'checked' in control &&
        !(control.checked ?? control.hasAttribute('checked'))
      ) {
        continue;
      }

      data.append(name, control.value ?? control.getAttribute('value') ?? '');
    }
  }

  return data;
}

if (NativeFormData) FormData.prototype = NativeFormData.prototype;
