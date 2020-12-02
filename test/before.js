import { spawn } from 'child_process'
import { writeFileSync } from 'fs'

const driver = spawn('geckodriver', {
  detached: true,
  stdio: 'ignore'
})

driver.unref()

writeFileSync('geckodriver.pid', `${driver.pid}`)
