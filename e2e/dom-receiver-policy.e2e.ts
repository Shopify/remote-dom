import {resolve} from 'node:path';
import {test, expect} from '@playwright/test';

const receiverModule = `/@fs/${resolve('packages/core/source/receivers/DOMRemoteReceiver.ts')}`;
const constantsModule = `/@fs/${resolve('packages/core/source/constants.ts')}`;

for (const attack of [
  'element',
  'nested-element',
  'initial-property',
  'property-update',
  'attribute-update',
  'text-update',
  'method',
  'root-method',
  'initial-url-property',
  'initial-url-attribute',
  'url-property',
  'url-attribute',
  'custom-property',
  'custom-method',
]) {
  test(`DOM receiver rejects ${attack} injection in a browser`, async ({
    page,
  }) => {
    // Use Vite to serve the source modules, without loading the example app.
    await page.route('**/receiver-policy-test', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><body></body></html>',
      }),
    );
    await page.goto('/receiver-policy-test');

    const result = await page.evaluate(
      async ({receiverModule, constantsModule, attack}) => {
        const {DOMRemoteReceiver} = await import(receiverModule);
        const {
          MUTATION_TYPE_INSERT_CHILD,
          MUTATION_TYPE_UPDATE_PROPERTY,
          MUTATION_TYPE_UPDATE_TEXT,
          NODE_TYPE_ELEMENT,
          NODE_TYPE_TEXT,
          ROOT_ID,
          UPDATE_PROPERTY_TYPE_ATTRIBUTE,
        } = await import(constantsModule);
        customElements.define(
          'ui-button',
          class extends HTMLElement {
            set data(value: string) {
              this.innerHTML = value;
            }
            set content(value: string) {
              this.innerHTML = value;
            }
            renderMarkup(value: string) {
              this.innerHTML = value;
            }
          },
        );
        const root = document.createElement('div');
        document.body.append(root);
        const receiver = new DOMRemoteReceiver({
          root,
          elements:
            attack === 'custom-method'
              ? {'ui-button': {methods: ['focus']}}
              : ['ui-button', 'a'],
          blockedProperties: ['content'],
        });
        const marker = 'document.body.dataset.remoteEscaped = "true"; void 0';
        const payload = `<img src="data:image/png,invalid" onerror='${marker}'>`;
        const button = {
          id: 'button',
          type: NODE_TYPE_ELEMENT,
          element: 'ui-button',
          children: [],
        };
        const link = {...button, element: 'a'};
        const script = {
          id: 'script',
          type: NODE_TYPE_ELEMENT,
          element: 'script',
          children: [{id: 'text', type: NODE_TYPE_TEXT, data: marker}],
        };
        const insert = (node: unknown) =>
          receiver.connection.mutate([
            [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, node, 0],
          ]);
        let error: string | undefined;
        try {
          switch (attack) {
            case 'element':
              insert(script);
              break;
            case 'nested-element':
              insert({...button, children: [script]});
              break;
            case 'initial-property':
              insert({...button, properties: {innerHTML: payload}});
              break;
            case 'initial-url-property':
              insert({...link, properties: {href: `java\nscript:${marker}`}});
              break;
            case 'initial-url-attribute':
              insert({...link, attributes: {href: `javascript:${marker}`}});
              break;
            default:
              insert(attack.startsWith('url-') ? link : button);
              if (attack.startsWith('url-')) {
                receiver.connection.mutate([
                  [
                    MUTATION_TYPE_UPDATE_PROPERTY,
                    'button',
                    'href',
                    `javascript:${marker}`,
                    attack === 'url-attribute'
                      ? UPDATE_PROPERTY_TYPE_ATTRIBUTE
                      : undefined,
                  ],
                ]);
                (root.firstChild as HTMLElement).click();
              } else if (attack === 'custom-property') {
                receiver.connection.mutate([
                  [MUTATION_TYPE_UPDATE_PROPERTY, 'button', 'content', payload],
                ]);
              } else if (attack === 'custom-method') {
                receiver.connection.call('button', 'renderMarkup', payload);
              } else if (attack === 'property-update') {
                receiver.connection.mutate([
                  [
                    MUTATION_TYPE_UPDATE_PROPERTY,
                    'button',
                    'innerHTML',
                    payload,
                  ],
                ]);
              } else if (attack === 'text-update') {
                receiver.connection.mutate([
                  [MUTATION_TYPE_UPDATE_TEXT, 'button', payload],
                ]);
              } else if (attack === 'attribute-update') {
                receiver.connection.mutate([
                  [
                    MUTATION_TYPE_UPDATE_PROPERTY,
                    'button',
                    'onclick',
                    marker,
                    UPDATE_PROPERTY_TYPE_ATTRIBUTE,
                  ],
                ]);
                (root.firstChild as HTMLElement).click();
              } else {
                receiver.connection.call(
                  attack === 'root-method' ? ROOT_ID : 'button',
                  'insertAdjacentHTML',
                  'beforeend',
                  payload,
                );
              }
          }
        } catch (caught) {
          error = String(caught);
        }
        return {
          error,
          injected: root.querySelectorAll('script, img').length,
          escaped: document.body.dataset.remoteEscaped,
        };
      },
      {receiverModule, constantsModule, attack},
    );

    expect(result.error).toContain('not allowed');
    expect(result.injected).toBe(0);
    expect(result.escaped).toBeUndefined();
  });
}
