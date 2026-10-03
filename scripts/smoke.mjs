import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });

await page.getByRole('button', { name: 'Escuchar y practicar' }).click();
await page.getByRole('heading', { name: 'Audio de práctica' }).waitFor();
await page.screenshot({ path: '/tmp/programa-audio.png', fullPage: true });

await page.getByRole('button', { name: 'Finanzas' }).click();
await page.getByRole('heading', { name: 'Finanzas personales' }).waitFor();

await page.locator('input[placeholder="Ej. 25000"]').fill('25000');
await page.locator('input[placeholder="Transporte, comida…"]').fill('Transporte');
await page.locator('textarea').fill('Gasolina');
await page.getByRole('button', { name: 'Guardar movimiento' }).click();
await page.getByText('Gasolina').first().waitFor();

await page.getByRole('button', { name: 'Préstamo' }).click();
await page.locator('input[placeholder="Ej. 25000"]').fill('100000');
await page.locator('input[placeholder="Nombre"]').fill('Carlos');
await page.locator('textarea').fill('Préstamo a Carlos');
await page.getByRole('button', { name: 'Guardar movimiento' }).click();
await page.getByText('Carlos').first().waitFor();

await page.screenshot({ path: '/tmp/programa-finance.png', fullPage: true });
await page.getByRole('button', { name: 'Inicio', exact: true }).click();
await page.getByRole('heading', { name: 'Programa', exact: true }).waitFor();
await page.screenshot({ path: '/tmp/programa-home.png', fullPage: true });

console.log('SMOKE_OK');
await browser.close();
