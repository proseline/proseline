import tap from 'tap'
import * as indices from '../indices.js'

tap.test('indices', test => {
  test.equal(indices.parse(indices.stringify(100)), 100)
  test.equal(indices.parse(indices.stringify(0)), 0)
  test.equal(indices.parse(indices.stringify(999999999999999)), 999999999999999)
  test.end()
})
