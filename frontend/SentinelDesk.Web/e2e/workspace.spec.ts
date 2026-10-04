import { test, expect, type Page } from '@playwright/test'
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD
async function signIn(page: Page, user = email!, pass = password!) {
  await page.goto('/')
  await page.getByLabel('Email', { exact: true }).fill(user)
  await page.getByLabel('Password', { exact: true }).fill(pass)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Security posture at a glance' })).toBeVisible()
}
test.beforeAll(() => { if (!email || !password) throw new Error('Set E2E_EMAIL and E2E_PASSWORD for a disposable test administrator account.') })

test('manage an incident and evidence, then view analytics and sign out', async ({ page, browser }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await signIn(page)
  const title = `Browser incident ${Date.now()}`
  const eventType = `Browser signal ${Date.now()}`
  const second = await browser.newContext()
  const observer = await second.newPage()
  await signIn(observer)
  await expect(observer.getByRole('status').filter({ hasText: /^Connected$/ })).toBeVisible()

  await page.getByRole('button', { name: 'Create incident' }).click()
  await page.getByLabel('Title', { exact: true }).fill(title)
  await page.getByLabel('Description', { exact: true }).fill('Browser regression evidence')
  await page.getByLabel('Severity', { exact: true }).selectOption('High')
  await page.getByRole('dialog').getByRole('button', { name: 'Create incident' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // A second independent browser session receives the SignalR update without refresh.
  await expect(observer.getByRole('button', { name: new RegExp(title) }).first()).toBeVisible({ timeout: 10000 })
  await second.close()

  await page.getByRole('button', { name: 'Incidents', exact: true }).click()
  await page.getByLabel('Search incidents').fill(title)
  await page.getByRole('button', { name: new RegExp(title) }).first().click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Description', { exact: true }).fill('Updated evidence from browser')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Updated evidence from browser', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Move to Investigating' }).click()
  await expect(page.getByRole('button', { name: 'Move to Contained' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: 'Security Events', exact: true }).click()
  await page.getByRole('button', { name: 'Record event' }).click()
  await page.getByLabel('Event type', { exact: true }).fill(eventType)
  await page.getByLabel('Source IP', { exact: true }).fill('192.0.2.40')
  await page.getByLabel('Description', { exact: true }).fill('Anomalous sign-in pattern')
  await page.getByLabel('Risk score (0–100)', { exact: true }).fill('90')
  await page.getByRole('dialog').getByRole('button', { name: 'Record event' }).click()
  await page.getByLabel('Search events').fill(eventType)
  await page.getByRole('button', { name: 'Link incident', exact: true }).click()
  await page.getByLabel('Search active incidents').fill(title)
  await page.getByRole('dialog').getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(title) }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: /^#/ }).click()
  await expect(page.getByRole('heading', { name: 'Linked security events (1)' })).toBeVisible()
  for (const status of ['Contained', 'Resolved', 'Closed']) {
    await page.getByRole('button', { name: `Move to ${status}` }).click()
    await expect(page.getByRole('dialog').getByText(status, { exact: true })).toBeVisible()
  }
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Archive', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Analytics', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Incident status', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Workspace members' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome to SentinelDesk' })).toBeVisible()
  expect(errors).toEqual([])
})

test('viewer has read-only controls on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page, 'viewer@example.test', 'Test-Only-Password123!')
  await expect(page.getByRole('button', { name: 'Create incident' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Security Events', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Record event' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Workspace members' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
