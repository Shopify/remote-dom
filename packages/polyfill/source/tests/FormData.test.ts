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
      ['remote-checkbox', 'unchecked-checkbox', null],
      ['remote-radio', 'unchecked-radio', null],
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
      } else if (name?.startsWith('unchecked-')) {
        control.checked = false;
      }
      form.append(control);
    }

    const unchecked = document.createElement('remote-toggle') as any;
    unchecked.setAttribute('name', 'currently-unchecked');
    unchecked.setAttribute('checked', '');
    unchecked.checked = false;
    form.append(unchecked);

    expect([...new FormData(form)]).toEqual([]);
  });

  it('uses the checked property exposed by custom elements', () => {
    const form = document.createElement('form');
    const checked = document.createElement('remote-checkbox') as any;
    const initiallyChecked = document.createElement('remote-radio') as any;
    const unmodeled = document.createElement('input');

    checked.setAttribute('name', 'choice');
    checked.setAttribute('value', 'one');
    checked.checked = true;
    initiallyChecked.setAttribute('name', 'choice');
    initiallyChecked.setAttribute('value', 'two');
    initiallyChecked.setAttribute('checked', '');
    initiallyChecked.checked = undefined;
    unmodeled.setAttribute('name', 'choice');
    unmodeled.setAttribute('type', 'checkbox');
    unmodeled.setAttribute('value', 'three');
    form.append(checked, initiallyChecked, unmodeled);

    expect(new FormData(form).getAll('choice')).toEqual([
      'one',
      'two',
      'three',
    ]);
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
