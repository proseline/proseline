const JSONFile = require('./json-file')
const fs = require('fs')
const lock = require('lock').Lock()
const mkdirp = require('mkdirp')
const path = require('path')

module.exports = {
  account: simpleFiles('accounts'),
  email: simpleFiles('emails'),
  token: simpleFiles('tokens'),
  session: simpleFiles('sessions'),
  lock
}

const account = module.exports.account

account.confirm = (handle, callback) => {
  const properties = { confirmed: new Date().toISOString() }
  account.update(handle, properties, callback)
}

const token = module.exports.token

token.use = (id, callback) => {
  const file = token.filePath(id)
  lock(file, unlock => {
    callback = unlock(callback)
    token.readWithoutLocking(id, (error, record) => {
      if (error) return callback(error)
      if (!record) return callback(null, null)
      token.deleteWithoutLocking(id, error => {
        if (error) return callback(error)
        callback(null, record)
      })
    })
  })
}

function simpleFiles (subdirectory, options) {
  options = options || {}
  const serialization = options.serialization
  const complexID = options.complexID
  const filePath = complexID
    ? id => path.join(process.env.DIRECTORY, subdirectory, complexID(id) + '.json')
    : id => path.join(process.env.DIRECTORY, subdirectory, id + '.json')
  return {
    write: (id, value, callback) => {
      lock(filePath(id), unlock => writeWithoutLocking(id, value, unlock(callback)))
    },
    writeWithoutLocking,
    read: (id, callback) => {
      lock(filePath(id), unlock => readWithoutLocking(id, unlock(callback)))
    },
    readWithoutLocking,
    createRawReadStream: id => {
      return fs.createReadStream(filePath(id), 'utf8')
    },
    exists: (id, callback) => {
      fs.access(filePath(id), error => {
        if (error) {
          if (error.code === 'ENOENT') {
            return callback(null, false)
          }
          return callback(error)
        }
        callback(null, true)
      })
    },
    update: (id, properties, callback) => {
      const file = filePath(id)
      lock(file, unlock => {
        callback = unlock(callback)
        JSONFile.read({ file, serialization }, (error, record) => {
          if (error) return callback(error)
          if (!record) return callback(null, null)
          Object.assign(record, properties)
          JSONFile.write({ file, data: record, serialization }, error => {
            if (error) return callback(error)
            callback(null, record)
          })
        })
      })
    },
    list: callback => {
      const directory = path.dirname(filePath('x'))
      fs.readdir(directory, (error, entries) => {
        if (error) return callback(error)
        const ids = entries.map(entry => path.basename(entry, '.json'))
        callback(null, ids)
      })
    },
    delete: (id, callback) => {
      lock(filePath(id), unlock => deleteWithoutLocking(id, unlock(callback)))
    },
    deleteWithoutLocking,
    filePath
  }

  function writeWithoutLocking (id, value, callback) {
    const file = filePath(id)
    const directory = path.dirname(file)
    mkdirp(directory, error => {
      if (error) return callback(error)
      JSONFile.write({ file, data: value, serialization }, callback)
    })
  }

  function readWithoutLocking (id, callback) {
    JSONFile.read({ file: filePath(id), serialization }, callback)
  }

  function deleteWithoutLocking (id, callback) {
    fs.unlink(filePath(id), error => {
      if (error && error.code === 'ENOENT') return callback()
      return callback(error)
    })
  }
}
