import { defineConfig } from '@playwright/test'

/**
 * Testes E2E de fumaça (smoke) da interface.
 *
 * Rodam contra um servidor já em execução (defina PLAYWRIGHT_BASE_URL) ou,
 * por padrão, contra http://localhost:3000. No ambiente do projeto, o Chromium
 * pré-instalado é usado via PLAYWRIGHT_CHROMIUM (opcional).
 *
 * Uso típico:
 *   1) yarn build && yarn start   (em outro terminal)
 *   2) yarn test:e2e
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list']],
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'mobile-chromium',
            use: {
                browserName: 'chromium',
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
                launchOptions: {
                    args: ['--no-sandbox'],
                    ...(executablePath ? { executablePath } : {}),
                },
            },
        },
    ],
})
