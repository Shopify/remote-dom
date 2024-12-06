import {test, expect} from '@playwright/test';
const sandbox = 'iframe';
const example = 'react';

test.use({baseURL: 'http://localhost:8081'});

test(`basic modal interaction remote-ui legacy rendered example`, async ({
  page,
}) => {
  await page.goto(`/`);

  await page.getByRole('button', {name: 'Open modal'}).click();
  await page.getByRole('button', {name: 'Click me!'}).click();
  await page.getByRole('button', {name: 'Click me!'}).click();

  await expect(page.getByText('Click Count: 2')).toBeVisible();

  page.once('dialog', (dialog) => {
    expect(dialog.message()).toBe('You clicked 2 times!');
    dialog.accept().catch(() => {});
  });

  const dialogPromise = page.waitForEvent('dialog');

  await page.getByRole('button', {name: 'Close'}).click();
  await dialogPromise;
});
