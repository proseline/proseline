const tape = require('tape')
const indices = require('../indices')

tape('indices', test => {
  test.equal(indices.parse(indices.stringify(100)), 100)
  test.equal(indices.parse(indices.stringify(0)), 0)
  test.equal(indices.parse(indices.stringify(999999999999999)), 999999999999999)
  test.end()
})
