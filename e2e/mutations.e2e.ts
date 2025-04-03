import {expect, test} from '@playwright/test';

const testSet: Array<[string, string, string]> = [
  ['iframe', 'react-mutations-1', 'Data: 1\nData: 2\nData: 3\nData: 4'],
  ['iframe', 'react-mutations-2', 'Data: 1\nData: 2'],
];

testSet.forEach(([sandbox, example, expectedText]) => {
  test(`mutations are applied correctly with ${sandbox} sandbox and ${example} example`, async ({
    page,
  }) => {
    await page.goto(`/?sandbox=${sandbox}&example=${example}`);
    await expect(page.getByTestId('test-done')).toBeAttached();
    const testStack = page.getByTestId('test-stack');
    expect(await testStack.innerText()).toBe(expectedText);
  });
});
