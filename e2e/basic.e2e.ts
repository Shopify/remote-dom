import {test, expect} from '@playwright/test';

[
  ['iframe', 'vanilla'],
  ['iframe', 'preact'],
  ['iframe', 'svelte'],
  ['iframe', 'vue'],
  ['iframe', 'htm'],
  ['iframe', 'react'],
  ['worker', 'vanilla'],
  ['worker', 'preact'],
  ['worker', 'svelte'],
  // ['worker', 'vue'],
  ['worker', 'htm'],
  ['worker', 'react'],
].forEach(([sandbox, example]) => {
  test(`basic modal interaction with ${sandbox} sandbox and ${example} example`, async ({
    page,
  }) => {
    await page.goto(`/?sandbox=${sandbox}&example=${example}`);

    await page.getByRole('button', {name: 'Open modal'}).click();
    await page.getByRole('button', {name: 'Click me!'}).click();
    await page.getByRole('button', {name: 'Click me!'}).click();

    await expect(page.getByText('Click Count: 2')).toBeVisible();

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toBe('You clicked 2 times!');
      dialog.dismiss().catch(() => {});
    });

    const dialogPromise = page.waitForEvent('dialog');
    await page.getByRole('button', {name: 'Close'}).click();
    await dialogPromise;
  });
});
