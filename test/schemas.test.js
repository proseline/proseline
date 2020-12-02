import AJV from 'ajv'
import { generateDistributionKey, generateDiscoveryKey } from '../crypto.js'
import * as schemas from '../schemas.js'
import tap from 'tap'

Object.keys(schemas).forEach(id => {
  tap.test(id, test => {
    const ajv = new AJV()
    ajv.validateSchema(schemas[id])
    test.deepEqual(ajv.errors, null, 'valid schema')
    test.end()
  })
})

tap.test('intro', test => {
  const intro = {
    version: '1.0.0-pre',
    discoveryKey: generateDiscoveryKey(generateDistributionKey()),
    type: 'intro',
    name: 'Kyle E. Mitchell',
    device: 'laptop',
    timestamp: new Date().toISOString(),
    index: 0
  }
  test.same(
    schemas.validate.intro(intro),
    { valid: true, errors: [] }
  )
  test.end()
})
