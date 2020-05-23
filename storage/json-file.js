const fs = require('fs')

exports.read = (options, callback) => {
  const file = options.file
  const serialization = options.serialization || JSON
  fs.readFile(file, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') return callback(null, null)
      return callback(error)
    }
    try {
      var parsed = serialization.parse(data)
    } catch (error) {
      return callback(error)
    }
    return callback(null, parsed)
  })
}

exports.write = (options, callback) => {
  const file = options.file
  const data = options.data
  const serialization = options.serialization || JSON
  const flag = options.flag || 'w'
  const stringified = serialization.stringify(data)
  fs.writeFile(file, stringified, { flag }, error => {
    if (error) {
      if (error.code === 'EEXIST') return callback(null, false)
      return callback(error, false)
    }
    callback(null, true)
  })
}
