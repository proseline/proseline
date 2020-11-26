// Read, write, and index various data records.

const assert = require('assert')
const lock = require('lock').Lock()
const path = require('path')
const s3 = require('./s3')

module.exports = {
  account: simpleFiles('accounts'),
  email: simpleFiles('emails'),
  token: simpleFiles('tokens'),
  session: simpleFiles('sessions'),
  lock
}

const account = module.exports.account

account.confirm = (handle, callback) => {
  assert(typeof handle === 'string')
  assert(typeof callback === 'function')
  const properties = { confirmed: new Date().toISOString() }
  account.update(handle, properties, callback)
}

const token = module.exports.token

token.use = (id, callback) => {
  assert(typeof id === 'string')
  assert(typeof callback === 'function')
  const key = token.key(id)
  lock(key, unlock => {
    callback = unlock(callback)
    token.readWithoutLocking(id, (error, record) => {
      /* istanbul ignore if */
      if (error) return callback(error)
      if (!record) return callback(null, null)
      token.deleteWithoutLocking(id, error => {
        /* istanbul ignore if */
        if (error) return callback(error)
        callback(null, record)
      })
    })
  })
}

function simpleFiles (subdirectory) {
  assert(typeof subdirectory === 'string')
  const keyFor = id => path.join(subdirectory, id)
  return {
    write: (id, value, callback) => {
      assert(typeof id === 'string')
      assert(value !== undefined)
      assert(typeof callback === 'function')
      lock(keyFor(id), unlock => writeWithoutLocking(id, value, unlock(callback)))
    },
    writeWithoutLocking,
    read: (id, callback) => {
      assert(typeof id === 'string')
      assert(typeof callback === 'function')
      lock(keyFor(id), unlock => readWithoutLocking(id, unlock(callback)))
    },
    readWithoutLocking,
    exists: (id, callback) => {
      assert(typeof id === 'string')
      assert(typeof callback === 'function')
      const key = keyFor(id)
      lock(key, unlock => s3.exists(key, unlock(callback)))
    },
    update: (id, properties, callback) => {
      assert(typeof id === 'string')
      assert(typeof properties === 'object')
      assert(typeof callback === 'function')
      const file = keyFor(id)
      lock(file, unlock => {
        callback = unlock(callback)
        s3.get(file, (error, record) => {
          /* istanbul ignore if */
          if (error) return callback(error)
          if (!record) return callback(null, null)
          Object.assign(record, properties)
          s3.put(file, record, error => {
            /* istanbul ignore if */
            if (error) return callback(error)
            callback(null, record)
          })
        })
      })
    },
    list: callback => {
      assert(typeof callback === 'function')
      const directory = path.dirname(keyFor('x'))
      s3.list(directory, callback)
    },
    delete: (id, callback) => {
      assert(typeof id === 'string')
      assert(typeof callback === 'function')
      lock(keyFor(id), unlock => deleteWithoutLocking(id, unlock(callback)))
    },
    deleteWithoutLocking,
    key: keyFor
  }

  function writeWithoutLocking (id, value, callback) {
    assert(typeof id === 'string')
    assert(value !== undefined)
    assert(typeof callback === 'function')
    const file = keyFor(id)
    s3.put(file, value, callback)
  }

  function readWithoutLocking (id, callback) {
    assert(typeof id === 'string')
    assert(typeof callback === 'function')
    s3.get(keyFor(id), callback)
  }

  function deleteWithoutLocking (id, callback) {
    assert(typeof id === 'string')
    assert(typeof callback === 'function')
    s3.delete(keyFor(id), error => {
      if (error && error.code === 'ENOENT') return callback()
      /* istanbul ignore next */
      return callback(error)
    })
  }
}
