// Convert numbers to and from lexically ordered keys.

const assert = require('assert')
const zeroFill = require('zero-fill')

const INDEX_WIDTH = 15
const MAX_INDEX = parseInt('9'.repeat(INDEX_WIDTH))

exports.stringify = function (index) {
  return zeroFill(INDEX_WIDTH, MAX_INDEX - index)
}

assert(exports.stringify(0) === '999999999999999')
assert(exports.stringify(1) === '999999999999998')

exports.parse = function (string) {
  return MAX_INDEX - parseInt(string)
}

assert(exports.parse('999999999999999') === 0)
assert(exports.parse('999999999999998') === 1)
