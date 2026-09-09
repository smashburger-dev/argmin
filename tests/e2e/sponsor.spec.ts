import { expect, test } from '@playwright/test';

test('sponsor slots open the modal with contact options', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto('/index.html#/today');
  await page.getByRole('button', { name: 'Werde Sponsor' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('no8@tuta.com');
  await expect(dialog).toContainText('einen Monat');
  await expect(page.getByRole('link', { name: 'E-Mail-Programm öffnen' })).toHaveAttribute('href', /^mailto:no8@tuta\.com/);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});
