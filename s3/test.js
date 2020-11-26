const assert = require('assert')

exports.DELIMITER = '/'

// This in-memory Map stores all of the data.
let data
exports.clear = () => { data = new Map() }
exports.clear()

exports.first = (prefix, callback) => {
  assert(typeof prefix === 'string')
  assert(typeof callback === 'function')
  setImmediate(() => {
    const key = Array.from(data.keys())
      .sort()
      .find(key => key.startsWith(prefix))
    callback(null, key)
  })
}

exports.delete = (key, callback) => {
  assert(typeof key === 'string')
  assert(typeof callback === 'function')
  setImmediate(() => {
    data.delete(key)
    callback()
  })
}

exports.get = (key, callback) => {
  assert(typeof key === 'string')
  assert(typeof callback === 'function')
  setImmediate(() => {
    if (!data.has(key)) return callback(null, undefined)
    callback(null, data.get(key))
  })
}

exports.put = (key, value, callback) => {
  assert(typeof key === 'string')
  assert(value !== undefined)
  assert(typeof callback === 'function')
  setImmediate(() => {
    data.set(key, value)
    callback(null, true)
  })
}

exports.list = (prefix, callback) => {
  assert(typeof prefix === 'string')
  assert(typeof callback === 'function')
  setImmediate(() => {
    const keys = Array.from(data.keys())
      .sort()
      .filter(key => key.startsWith(prefix))
    callback(null, keys)
  })
}

exports.exists = (key, callback) => {
  assert(typeof key === 'string')
  assert(typeof callback === 'function')
  setImmediate(() => {
    callback(null, data.has(key))
  })
}
