import {beforeEach, describe, expect, it, vi} from 'vitest';

import {Window} from '../index.ts';

const NativeFormData = globalThis.FormData;

describe('FormData', () => {
  beforeEach(() => {
    Window.setGlobalThis(new Window());
  });

  it('constructs an empty mutable native FormData', () => {
    const data = new FormData();

    data.append('message', 'hello');

    expect(data.get('message')).toBe('hello');
    expect(data).toBeInstanceOf(NativeFormData);
    expect(data).toBeInstanceOf(FormData);
    expect(data.constructor).toBe(NativeFormData);
    expect(Object.prototype.toString.call(data)).toBe('[object FormData]');
  });

  it('is installed by Window.setGlobal()', () => {
    const window = new Window();

    Window.setGlobal(window);

    expect(globalThis.FormData).toBe(window.FormData);
  });

  it('collects named controls in tree order and preserves duplicate names', () => {
    const form = document.createElement('form');
    const first = document.createElement('input');
    const group = document.createElement('div');
    const second = document.createElement('input');
    const last = document.createElement('textarea');

    first.setAttribute('name', 'item');
    first.setAttribute('value', 'first');
    second.setAttribute('name', 'item');
    second.setAttribute('value', 'second');
    last.setAttribute('name', 'note');
    last.setAttribute('value', 'last');
    group.append(second);
    form.append(first, group, last);

    expect([...new FormData(form)]).toEqual([
      ['item', 'first'],
      ['item', 'second'],
      ['note', 'last'],
    ]);
  });

  it('prefers current property values to initial attributes', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');

    input.setAttribute('name', 'message');
    input.setAttribute('value', 'initial');
    input.value = 'current';
    form.append(input);

    expect(new FormData(form).get('message')).toBe('current');
  });

  it('omits unsuccessful controls', () => {
    const form = document.createElement('form');
    const controls = [
      ['input', null, 'unnamed'],
      ['input', 'disabled-attribute', 'disabled'],
      ['input', 'disabled-property', null],
      ['input', 'unchecked-checkbox', 'checkbox'],
      ['input', 'unchecked-radio', 'radio'],
      ['button', 'button-element', null],
      ['BUTTON', 'uppercase-button-element', null],
      ['input', 'button-input', 'button'],
      ['input', 'image-input', 'image'],
      ['input', 'reset-input', 'reset'],
      ['input', 'submit-input', 'submit'],
    ] as const;

    for (const [tag, name, type] of controls) {
      const control = document.createElement(tag) as any;
      if (name) control.setAttribute('name', name);
      control.setAttribute('value', name ?? 'unnamed');
      if (type) control.setAttribute('type', type);
      if (name === 'disabled-attribute') {
        control.setAttribute('disabled', '');
      } else if (name === 'disabled-property') {
        control.disabled = true;
      }
      form.append(control);
    }

    const unchecked = document.createElement('input');
    unchecked.setAttribute('name', 'currently-unchecked');
    unchecked.setAttribute('type', 'checkbox');
    unchecked.setAttribute('checked', '');
    unchecked.checked = false;
    form.append(unchecked);

    expect([...new FormData(form)]).toEqual([]);
  });

  it('includes checked checkboxes and radios', () => {
    const form = document.createElement('form');
    const checkbox = document.createElement('input');
    const radio = document.createElement('input');

    checkbox.setAttribute('name', 'choice');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.setAttribute('value', 'one');
    checkbox.checked = true;
    radio.setAttribute('name', 'choice');
    radio.type = 'radio';
    radio.value = 'two';
    radio.setAttribute('checked', '');
    form.append(checkbox, radio);

    expect(new FormData(form).getAll('choice')).toEqual(['one', 'two']);
  });

  it('passes Blob and File values to the native FormData', async () => {
    const form = document.createElement('form');
    const blobInput = document.createElement('input');
    const fileInput = document.createElement('input');
    const file = new File(['file contents'], 'example.txt');

    blobInput.setAttribute('name', 'blob');
    blobInput.value = new Blob(['blob contents'], {
      type: 'text/plain',
    }) as any;
    fileInput.setAttribute('name', 'file');
    fileInput.value = file as any;
    form.append(blobInput, fileInput);

    const data = new FormData(form);
    const blob = data.get('blob');

    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('text/plain');
    expect(await (blob as Blob).text()).toBe('blob contents');
    expect(data.get('file')).toBe(file);
  });

  it('can be imported when native FormData is unavailable', async () => {
    const InstalledFormData = globalThis.FormData;

    try {
      delete (globalThis as any).FormData;
      vi.resetModules();

      await expect(import('../FormData.ts')).resolves.toHaveProperty(
        'FormData',
      );
    } finally {
      globalThis.FormData = InstalledFormData;
    }
  });
});
