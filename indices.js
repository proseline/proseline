// Convert numbers to and from lexically ordered keys.

import assert from 'assert'
import zeroFill from 'zero-fill'

const INDEX_WIDTH = 15
const MAX_INDEX = parseInt('9'.repeat(INDEX_WIDTH))

export const stringify = function (index) {
  return zeroFill(INDEX_WIDTH, MAX_INDEX - index)
}

assert(stringify(0) === '999999999999999')
assert(stringify(1) === '999999999999998')

export const parse = function (string) {
  return MAX_INDEX - parseInt(string)
}

assert(parse('999999999999999') === 0)
assert(parse('999999999999998') === 1)
