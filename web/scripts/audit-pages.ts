import { chromium } from 'playwright'
import * as fs from 'fs'

const PAGES = [
  { name: 'MyDay', appUrl: 'http://localhost:5177/tareas', designUrl: 'http://localhost:3100/sections/task-management/screen-designs/MyDay' },
  { name: 'ProjectList', appUrl: 'http://localhost:5177/tareas/proyectos', designUrl: 'http://localhost:3100/sections/task-management/screen-designs/ProjectList' },
  { name: 'Kanban', appUrl: 'http://localhost:5177/tareas/kanban', designUrl: 'http://localhost:3100/sections/task-management/screen-designs/KanbanBoard' },
  { name: 'Dashboard', appUrl: 'http://localhost:5177/tareas/dashboard', designUrl: 'http://localhost:3100/sections/task-management/screen-designs/KPIDashboard' },
]

const OUTPUT_DIR = '/tmp/workhub-audit'

async function auditPage(page: any, name: string, url: string, prefix: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Auditando: ${name} (${prefix})`)
  console.log(`URL: ${url}`)
  console.log(`${'='.repeat(60)}`)

  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1500) // Extra wait for React render

  // Screenshot
  const screenshotPath = `${OUTPUT_DIR}/${name}_${prefix}.png`
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`Screenshot: ${screenshotPath}`)

  // Capturar elementos
  const buttons = await page.locator('button').allInnerTexts()
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').allInnerTexts()
  const cards = await page.locator('[class*="MuiPaper"], [class*="MuiCard"], [class*="card"]').count()
  const inputs = await page.locator('input, textarea').count()

  // Chips/badges
  const chips = await page.locator('[class*="MuiChip"], [class*="badge"]').allInnerTexts()

  console.log(`\nElementos detectados:`)
  console.log(`  Botones (${buttons.length}): ${buttons.slice(0, 5).join(', ')}`)
  console.log(`  Headings (${headings.length}): ${headings.slice(0, 5).join(', ')}`)
  console.log(`  Cards: ${cards}`)
  console.log(`  Inputs: ${inputs}`)
  console.log(`  Chips: ${chips.slice(0, 5).join(', ')}`)

  return { buttons, headings, cards, inputs, chips }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const results: Record<string, any> = {}

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } })
  const page = await context.newPage()

  for (const pg of PAGES) {
    results[pg.name] = {
      app: await auditPage(page, pg.name, pg.appUrl, 'app'),
      design: await auditPage(page, pg.name, pg.designUrl, 'design'),
    }
  }

  await browser.close()

  // Guardar resultados
  fs.writeFileSync(`${OUTPUT_DIR}/audit-results.json`, JSON.stringify(results, null, 2))

  console.log(`\n\n${'='.repeat(60)}`)
  console.log('AUDITORÍA COMPLETADA')
  console.log(`Resultados en: ${OUTPUT_DIR}`)
  console.log(`${'='.repeat(60)}`)
}

main().catch(console.error)
