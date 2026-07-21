import { test, expect } from '@playwright/test'

/**
 * Smoke tests da interface — validam que as telas principais carregam, sem
 * scroll horizontal (responsividade mobile) e com o conteúdo essencial.
 */

async function semScrollHorizontal(page: import('@playwright/test').Page) {
    const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
    }))
    expect(scrollW, 'não deve haver scroll horizontal de página').toBeLessThanOrEqual(
        clientW + 2,
    )
}

test('landing pública da barbearia renderiza serviços e não estoura na horizontal', async ({
    page,
}) => {
    await page.goto('/barbearia/barbabrutal', { waitUntil: 'load' })
    await expect(page.getByRole('heading', { name: /Escolha seu serviço/i })).toBeVisible()
    await expect(page.getByText(/Agendar horário/i).first()).toBeVisible()
    await semScrollHorizontal(page)
})

test('landing usa a cor de destaque da barbearia (CSS var --brand)', async ({ page }) => {
    await page.goto('/barbearia/barbabrutal', { waitUntil: 'load' })
    const brand = await page.evaluate(() =>
        getComputedStyle(document.querySelector('[style*="--brand"]') as HTMLElement)
            .getPropertyValue('--brand')
            .trim(),
    )
    expect(brand).toMatch(/^#|rgb/)
})

test('login carrega o formulário e não estoura na horizontal', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'load' })
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(page.locator('input[type=password]')).toBeVisible()
    await semScrollHorizontal(page)
})

test('login abre com o parâmetro de barbearia (?tenant=) sem quebrar', async ({ page }) => {
    // A marca do tenant é resolvida via chamada ao backend em runtime; aqui
    // garantimos que a rota com ?tenant= carrega o formulário normalmente.
    await page.goto('/login?tenant=2', { waitUntil: 'load' })
    await expect(page.locator('input[type=email]')).toBeVisible()
    await semScrollHorizontal(page)
})
