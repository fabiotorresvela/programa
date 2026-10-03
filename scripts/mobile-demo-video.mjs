import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('/tmp/programa-mobile-demo', { recursive: true });
const iPhone = devices['iPhone 13'];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...iPhone,
  locale: 'es-CO',
  recordVideo: { dir: '/tmp/programa-mobile-demo', size: iPhone.viewport },
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const tabs = page.getByRole('navigation', { name: 'Navegación móvil' });
await tabs.getByRole('button', { name: 'Audio' }).click({ force: true });
await page.waitForTimeout(1000);
await tabs.getByRole('button', { name: 'Finanzas' }).click({ force: true });
await page.waitForTimeout(900);
await page.locator('input[placeholder="Ej. 25000"]').fill('18000');
await page.locator('textarea').fill('Café');
await page.getByRole('button', { name: 'Guardar movimiento' }).click();
await page.waitForTimeout(1000);
await tabs.getByRole('button', { name: 'Inicio' }).click({ force: true });
await page.waitForTimeout(900);
const video = page.video();
await context.close();
console.log('VIDEO_PATH=' + (await video.path()));
await browser.close();
