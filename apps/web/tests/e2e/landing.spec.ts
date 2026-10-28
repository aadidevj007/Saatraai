import { expect, test } from '@playwright/test';

test('landing actions use link semantics and sign-in navigation works', async ({ page }) => {
  await page.route('http://127.0.0.1:8000/health', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }),
  );

  await page.goto('/');

  await expect(page.locator('a button')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Sign in to SAATRAAI' })).toBeVisible();
});

test('mobile section navigation opens and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const trigger = page.getByRole('button', { name: 'Open navigation' });
  const navigation = page.getByRole('navigation', { name: 'Mobile sections' });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(navigation).toBeVisible();
  await expect(page.getByRole('link', { name: 'Capabilities', exact: true })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
});
