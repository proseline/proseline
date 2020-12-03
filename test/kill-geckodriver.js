import { readFileSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'

const file = 'geckodriver.pid'
const pid = readFileSync(file, 'utf8')
spawnSync('kill', ['-9', pid])
unlinkSync(file)
