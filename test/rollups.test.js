import { group, locate } from '../rollups.js'
import tap from 'tap'

tap.test('rollup: location', test => {
  const vectors = [
    // [index, head, result]
    [0, 100, false],
    [1, 100, 100],
    [1, 10, 10],
    [99, 99, false],
    [100, 200, false],
    [20, 100, 100],
    [21, 100, 100],
    [15, 15, false],
    [70, 80, false]
  ]
  vectors.forEach(vector => test.same(
    locate(vector[0], vector[1]),
    vector[2],
    `(${vector[0]}, ${vector[1]}) -> ${vector[2]}`
  ))
  test.throws(() => {
    locate(100, 10)
  }, /greater than/, 'throws when index > head')
  test.end()
})

tap.test('rollup: grouping', test => {
  const vectors = [
    [10, { first: 1, last: 10 }],
    [100, { first: 1, last: 100 }],
    [50, { first: 41, last: 50 }],
    [7, false],
    [3, false],
    [11, false]
  ]
  vectors.forEach(vector => {
    test.same(
      group(vector[0]), vector[1],
      `$({vector[0]}) -> ${JSON.stringify(vector[1])}`
    )
  })
  test.end()
})
