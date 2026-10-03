import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 13'];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...iPhone,
  locale: 'es-CO',
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

const tabs = page.getByRole('navigation', { name: 'Navegación móvil' });
await tabs.getByRole('button', { name: 'Audio' }).click({ force: true });
await page.getByRole('heading', { name: 'Audio de práctica' }).waitFor();
await page.screenshot({ path: '/tmp/programa-mobile-audio.png', fullPage: true });

await tabs.getByRole('button', { name: 'Finanzas' }).click({ force: true });
await page.getByRole('heading', { name: 'Finanzas personales' }).waitFor();
await page.locator('input[placeholder="Ej. 25000"]').fill('18000');
await page.locator('textarea').fill('Café');
await page.getByRole('button', { name: 'Guardar movimiento' }).click();
await page.getByText('Café').first().waitFor();
await page.screenshot({ path: '/tmp/programa-mobile-finance.png', fullPage: true });

await tabs.getByRole('button', { name: 'Inicio' }).click({ force: true });
await page.getByRole('heading', { name: 'Programa', exact: true }).waitFor();
await page.screenshot({ path: '/tmp/programa-mobile-home.png', fullPage: true });

console.log('MOBILE_SMOKE_OK');
await browser.close();
