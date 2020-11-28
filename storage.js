// Read, write, and index various data records.

// Key Layout
//
// accounts/{handle}
//   -> e-mail address
//   -> password hash
//   -> account confirmation status
//   -> bad-password lock information
//   -> ...
//
// emails/{e-mail address}
//   -> account handle
//
// sessions/{UUID}
//   -> handle
//
// projects/{project discovery key}
//   -> keys
//   -> creator's handle
//
// projectJournals/{project discovery key}/{journal public key}
//   -> handle
//   -> journal key pair
//
// entries/{project discovery key}/{journal public key}/{lexical index}
//   -> envelope
//
// accountProjects/{handle}/{project discovery key}
//   -> project title
//   -> journal key pair

const assert = require('assert')
const indices = require('./indices')
const lock = require('lock').Lock()
const path = require('path')
const s3 = require('./s3')

module.exports = {
  account: simple('accounts'),
  email: simple('emails'),
  token: simple('tokens'),
  session: simple('sessions'),
  project: (() => {
    return {
      write: (discoveryKey, value, callback) => {
        s3.put(keyFor(discoveryKey), value, callback)
      },
      read: (discoveryKey, callback) => {
        s3.get(keyFor(discoveryKey), callback)
      }
    }
    function keyFor (discoveryKey) {
      return path.join('projects', discoveryKey)
    }
  })(),
  accountProject: (() => {
    return {
      write: (handle, discoveryKey, value, callback) => {
        s3.put(keyFor(handle, discoveryKey), value, callback)
      },
      read: (handle, discoveryKey, callback) => {
        s3.get(keyFor(handle, discoveryKey), callback)
      },
      list: (handle, callback) => {
        const directory = path.dirname(keyFor(handle, 'x')) + '/'
        s3.list(directory, (error, keys) => {
          if (error) return callback(error)
          callback(null, keys.map(key => path.basename(key)))
        })
      }
    }
    function keyFor (handle, discoveryKey) {
      return path.join('accountProjects', handle, discoveryKey)
    }
  })(),
  projectJournal: (() => {
    return {
      write: (discoveryKey, publicKey, value, callback) => {
        s3.put(keyFor(discoveryKey, publicKey), value, callback)
      },
      read: (discoveryKey, publicKey, callback) => {
        s3.get(keyFor(discoveryKey, publicKey), callback)
      },
      list: (discoveryKey, callback) => {
        const directory = path.dirname(keyFor(discoveryKey, 'x')) + '/'
        s3.list(directory, callback)
      }
    }
    function keyFor (discoveryKey, journalPublicKey) {
      return path.join('projectJournals', discoveryKey, journalPublicKey)
    }
  })(),
  entry: (() => {
    return {
      write: (discoveryKey, publicKey, index, value, callback) => {
        s3.put(keyFor(discoveryKey, publicKey, index), value, callback)
      },
      read: (discoveryKey, publicKey, index, callback) => {
        s3.get(keyFor(discoveryKey, publicKey, index), callback)
      },
      list: (discoveryKey, publicKey, callback) => {
        const directory = path.dirname(keyFor(discoveryKey, publicKey, 0)) + '/'
        s3.list(directory, (error, keys) => {
          if (error) return callback(error)
          callback(null, keys.map(key => indices.parse(key)))
        })
      }
    }
    function keyFor (discoveryKey, journalPublicKey, index) {
      return path.join(
        'entries',
        discoveryKey,
        journalPublicKey,
        indices.stringify(index)
      )
    }
  })(),
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

function simple (subdirectory) {
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
      const key = keyFor(id)
      lock(key, unlock => {
        callback = unlock(callback)
        s3.get(key, (error, record) => {
          /* istanbul ignore if */
          if (error) return callback(error)
          if (!record) return callback(null, null)
          Object.assign(record, properties)
          s3.put(key, record, error => {
            /* istanbul ignore if */
            if (error) return callback(error)
            callback(null, record)
          })
        })
      })
    },
    list: callback => {
      assert(typeof callback === 'function')
      const directory = path.dirname(keyFor('x')) + '/'
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
    s3.put(keyFor(id), value, callback)
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
