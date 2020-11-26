// Hash passwords for server-side storage.

const scheme = require('./scheme')

module.exports = (password, callback) => {
  const passwordBuffer = Buffer.from(password)
  scheme.hash(passwordBuffer, (error, hashBuffer) => {
    /* istanbul ignore if */
    if (error) return callback(error)
    callback(null, hashBuffer.toString('hex'))
  })
}
