import {resolve} from 'node:path';
import {test, expect} from '@playwright/test';

const receiverModule = `/@fs/${resolve('packages/core/source/receivers/DOMRemoteReceiver.ts')}`;
const constantsModule = `/@fs/${resolve('packages/core/source/constants.ts')}`;

const tags = ['a', 'area'] as const;
const variants = ['javascript:', 'javascript', ['javascript:']] as const;
const operations = ['initial', 'update'] as const;

for (const tag of tags) {
  for (const variant of variants) {
    for (const operation of operations) {
      const label = Array.isArray(variant)
        ? 'array'
        : variant.includes(':')
          ? 'colon'
          : 'colonless';
      test(`${tag} rejects ${operation} protocol ${label} in a browser`, async ({
        page,
      }) => {
        await page.route('**/receiver-protocol-test', (route) =>
          route.fulfill({
            contentType: 'text/html',
            body: '<!doctype html><html><body></body></html>',
          }),
        );
        await page.goto('/receiver-protocol-test');

        const result = await page.evaluate(
          async ({
            receiverModule,
            constantsModule,
            tag,
            variant,
            operation,
          }) => {
            const {DOMRemoteReceiver} = await import(receiverModule);
            const {
              MUTATION_TYPE_INSERT_CHILD,
              MUTATION_TYPE_UPDATE_PROPERTY,
              NODE_TYPE_ELEMENT,
              ROOT_ID,
            } = await import(constantsModule);

            const root = document.createElement('div');
            document.body.append(root);
            const receiver = new DOMRemoteReceiver({
              root,
              elements: [tag],
            });

            const marker = 'window.__protocolProbe = true; void 0';
            const node = {
              id: 'link',
              type: NODE_TYPE_ELEMENT,
              element: tag,
              children: [],
              properties:
                operation === 'initial'
                  ? {href: `custom:${marker}`, protocol: variant}
                  : {href: `custom:${marker}`},
            };

            let error: string | undefined;
            try {
              receiver.connection.mutate([
                [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, node, 0],
              ]);

              if (operation === 'update') {
                receiver.connection.mutate([
                  [MUTATION_TYPE_UPDATE_PROPERTY, 'link', 'protocol', variant],
                ]);
              }
            } catch (caught) {
              error = String(caught);
            }
            if (root.firstChild) {
              (root.firstChild as HTMLElement).click();
            }

            return {
              error,
              nodeCount: root.childNodes.length,
              probe: (window as any).__protocolProbe,
              href:
                operation === 'initial'
                  ? null
                  : (root.firstChild as HTMLAnchorElement | null)?.href,
            };
          },
          {receiverModule, constantsModule, tag, variant, operation},
        );

        if (operation === 'initial') {
          expect(result.error).toContain('not allowed');
          expect(result.nodeCount).toBe(0);
        } else {
          expect(result.error).toContain('not allowed');
          expect(result.href).toMatch(/^custom:/);
        }
        expect(result.probe).toBeUndefined();
      });
    }
  }
}

test('typed policy cannot override protocol rejection', async ({page}) => {
  await page.route('**/receiver-protocol-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body></body></html>',
    }),
  );
  await page.goto('/receiver-protocol-test');

  const result = await page.evaluate(
    async ({receiverModule, constantsModule}) => {
      const {DOMRemoteReceiver} = await import(receiverModule);
      const {MUTATION_TYPE_INSERT_CHILD, NODE_TYPE_ELEMENT, ROOT_ID} =
        await import(constantsModule);

      const root = document.createElement('div');
      document.body.append(root);
      const receiver = new DOMRemoteReceiver({
        root,
        elements: {
          a: {
            properties: {
              href: {type: 'string'},
              protocol: {type: 'string'},
            },
          },
        },
      });

      const marker = 'window.__protocolProbe = true; void 0';
      const node = {
        id: 'link',
        type: NODE_TYPE_ELEMENT,
        element: 'a',
        children: [],
        properties: {
          href: `custom:${marker}`,
          protocol: 'javascript',
        },
      };

      let error: string | undefined;
      try {
        receiver.connection.mutate([
          [MUTATION_TYPE_INSERT_CHILD, ROOT_ID, node, 0],
        ]);
      } catch (caught) {
        error = String(caught);
      }
      if (root.firstChild) {
        (root.firstChild as HTMLElement).click();
      }

      return {
        error,
        nodeCount: root.childNodes.length,
        probe: (window as any).__protocolProbe,
      };
    },
    {receiverModule, constantsModule},
  );

  expect(result.error).toContain('not allowed');
  expect(result.nodeCount).toBe(0);
  expect(result.probe).toBeUndefined();
});
