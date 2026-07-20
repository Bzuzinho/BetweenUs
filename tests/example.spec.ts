import { test, expect } from '@playwright/test'

const cases = [
  { language: 'pt-PT', heading: 'Entrar', htmlLang: 'pt-PT' },
  { language: 'en', heading: 'Log in', htmlLang: 'en' },
  { language: 'fr', heading: 'Se connecter', htmlLang: 'fr' },
]

for (const item of cases) {
  test(`renders the login page in ${item.language}`, async ({ page }) => {
    await page.addInitScript(language => {
      window.localStorage.setItem('betweenus.language', language)
    }, item.language)

    await page.goto('/login')

    await expect(page).toHaveTitle('Between Us')
    await expect(page.locator('html')).toHaveAttribute('lang', item.htmlLang)
    await expect(page.getByRole('heading', { name: item.heading })).toBeVisible()
    await expect(page.getByText('Between Us', { exact: true })).toBeVisible()
  })
}

test('falls back to Portuguese for an unsupported stored language', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('betweenus.language', 'de')
  })

  await page.goto('/login')

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT')
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
})
