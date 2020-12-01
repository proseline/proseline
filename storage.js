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
// rollups/{project discovery key}/{journal public key}/{last index}
//   last index % 100: -> [envelope (n-99)...last index]
//   last index % 10:  -> [envelope (n-9)...last index]
//
// accountProjects/{handle}/{project discovery key}
//   -> project title
//   -> journal key pair

const LRUCache = require('lru-cache')
const assert = require('assert')
const from2 = require('from2')
const indices = require('./indices')
const lock = require('lock').Lock()
const rollups = require('./rollups')
const runParallelLimit = require('run-parallel-limit')
const runSeries = require('run-series')
const s3 = require('./s3')

module.exports = {
  account: simple('accounts'),
  email: simple('emails'),
  token: simple('tokens'),
  session: simple('sessions'),

  project: (() => {
    const cache = new LRUCache({
      max: 100,
      length: (n, key) => 1
    })
    return {
      cache,
      write: (discoveryKey, value, callback) => {
        s3.put(keyFor(discoveryKey), value, callback)
      },
      read: (discoveryKey, callback) => {
        const key = keyFor(discoveryKey)
        const cached = cache.get(key)
        if (cached) return setImmediate(() => callback(null, cached))
        s3.get(key, (error, value) => {
          if (error) return callback(error)
          cache.set(key, value)
          callback(null, value)
        })
      }
    }
    function keyFor (discoveryKey) {
      return join('projects', discoveryKey)
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
        const prefix = dirname(keyFor(handle, 'x')) + '/'
        s3.list(prefix, (error, keys) => {
          if (error) return callback(error)
          callback(null, keys.map(key => basename(key)))
        })
      }
    }
    function keyFor (handle, discoveryKey) {
      return join('accountProjects', handle, discoveryKey)
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
        const prefix = dirname(keyFor(discoveryKey, 'x')) + '/'
        s3.list(prefix, callback)
      }
    }
    function keyFor (discoveryKey, journalPublicKey) {
      return join('projectJournals', discoveryKey, journalPublicKey)
    }
  })(),

  entry: (() => {
    const cache = new LRUCache({
      max: 500,
      length: (n, key) => 1
    })
    return {
      cache,

      write: (discoveryKey, publicKey, index, value, callback) => {
        const key = keyFor(discoveryKey, publicKey, index)
        s3.put(key, value, (error) => {
          if (error) return callback(error)
          // Create a roll-up if appropriate.
          const range = rollups.group(index)
          if (!range) return callback()
          const tasks = []
          for (let index = range.first; index < range.last; index++) {
            tasks.push(done => {
              s3.get(keyFor(discoveryKey, publicKey, index), done)
            })
          }
          tasks.push(done => done(null, value))
          runParallelLimit(tasks, 3, (error, entries) => {
            if (error) return callback(error)
            const key = rollUpKey(discoveryKey, publicKey, index)
            s3.put(key, entries, callback)
          })
        })
      },

      read: (discoveryKey, publicKey, index, callback) => {
        const key = keyFor(discoveryKey, publicKey, index)
        const cached = cache.get(key)
        if (cached) return setImmediate(() => callback(null, cached))
        s3.get(key, (error, value) => {
          if (error) return callback(error)
          cache.set(key, value)
          callback(null, value)
        })
      },

      list: (discoveryKey, publicKey, callback) => {
        const prefix = dirname(keyFor(discoveryKey, publicKey, 0)) + '/'
        s3.list(prefix, (error, keys) => {
          if (error) return callback(error)
          callback(null, keys.map(key => indices.parse(basename(key))))
        })
      },

      head: (discoveryKey, publicKey, callback) => {
        const prefix = `entries/${discoveryKey}/${publicKey}`
        s3.first(prefix, (error, key) => {
          if (error) return callback(error)
          if (!key) return callback()
          callback(null, indices.parse(basename(key)))
        })
      },

      // Return a stream of journal entries, starting with
      // index `from`, making as few S3 queries as possible.
      stream: (discoveryKey, publicKey, from = 0) => {
        let index = from
        let rollup = []
        let head
        return from2.obj((_, next) => {
          // We're done streaming when we reach the head.
          if (index > head) return next(null, null)

          // The entry to stream for this invocation, if any.
          let result

          // Compile a list of asynchronous tasks to run.
          const tasks = []

          // If we don't yet know the index of the last
          // entry in the journal, or "head", read it first.
          if (!head) {
            tasks.push(done => {
              module.exports.entry.head(discoveryKey, publicKey, (error, read) => {
                if (error) return done(error)
                head = read
                done()
              })
            })
          }

          // If we've already read a roll-up, stream from there.
          if (rollup.length !== 0) {
            tasks.push(done => {
              result = rollup.shift()
              done()
            })

          // Otherwise...
          } else {
            // Should we read a roll-up, instead of just one entry?
            const lastIndex = rollups.locate(index, head)

            // Read a roll-up.
            if (lastIndex) {
              // Read the roll-up containing the entry.
              tasks.push(done => {
                const key = rollUpKey(discoveryKey, publicKey, lastIndex)
                s3.get(key, (error, read) => {
                  if (error) return done(error)
                  rollup = read
                  // The entry we need to stream may not be
                  // the first entry in the roll-up we just
                  // read. Shift off any prior entries.
                  while (rollup[0].index !== index) rollup.shift()
                  // Stream the entry from the roll-up.
                  result = rollup.shift()
                  done()
                })
              })

            // Read the entry individually.
            } else {
              tasks.push(done => {
                module.exports.entry.read(discoveryKey, publicKey, index, (error, read) => {
                  if (error) return done(error)
                  result = read
                  done()
                })
              })
            }
          }

          // Run the tasks.
          runSeries(tasks, (error) => {
            if (error) return next(error)
            if (result) {
              index++
              return next(null, result)
            }
            next(null, null)
          })
        })
      }
    }

    function keyFor (discoveryKey, journalPublicKey, index) {
      return join(
        'entries',
        discoveryKey,
        journalPublicKey,
        indices.stringify(index)
      )
    }

    function rollUpKey (discoveryKey, journalPublicKey, lastIndex) {
      return `rollups/${discoveryKey}/${journalPublicKey}/${lastIndex}`
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

function simple (prefix) {
  assert(typeof prefix === 'string')
  const keyFor = id => join(prefix, id)
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
      const directory = dirname(keyFor('x')) + '/'
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

// Key Helpers

function dirname (key) {
  return key
    .split(s3.DELIMITER)
    .slice(0, -1)
    .join(s3.DELIMITER)
}

function basename (key) {
  const split = key.split(s3.DELIMITER)
  return split[split.length - 1]
}

function join (...parts) {
  return parts.join(s3.DELIMITER)
}
