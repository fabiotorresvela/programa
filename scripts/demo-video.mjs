import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('/tmp/programa-demo', { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  recordVideo: { dir: '/tmp/programa-demo', size: { width: 1280, height: 900 } },
  locale: 'es-CO',
});
const page = await context.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

await page.getByRole('button', { name: 'Escuchar y practicar' }).click();
await page.getByRole('heading', { name: 'Audio de práctica' }).waitFor();
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Escuchar resumen' }).click();
await page.waitForTimeout(1800);

await page.getByRole('button', { name: 'Finanzas' }).click();
await page.getByRole('heading', { name: 'Finanzas personales' }).waitFor();
await page.waitForTimeout(700);

await page.locator('input[placeholder="Ej. 25000"]').fill('25000');
await page.locator('input[placeholder="Transporte, comida…"]').fill('Transporte');
await page.locator('textarea').fill('Gasolina');
await page.getByRole('button', { name: 'Guardar movimiento' }).click();
await page.getByText('Gasolina').first().waitFor();
await page.waitForTimeout(800);

await page.getByRole('button', { name: 'Préstamo' }).click();
await page.locator('input[placeholder="Ej. 25000"]').fill('100000');
await page.locator('input[placeholder="Nombre"]').fill('Carlos');
await page.locator('textarea').fill('Préstamo a Carlos');
await page.getByRole('button', { name: 'Guardar movimiento' }).click();
await page.getByText('Carlos').first().waitFor();
await page.waitForTimeout(1200);

await page.getByRole('button', { name: 'Inicio', exact: true }).click();
await page.getByRole('heading', { name: 'Programa', exact: true }).waitFor();
await page.waitForTimeout(1000);

const video = page.video();
await context.close();
const path = await video.path();
console.log('VIDEO_PATH=' + path);
await browser.close();
