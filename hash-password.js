// Hash passwords for server-side storage.

const passwordHashing = require('./password-hashing')

module.exports = (password, callback) => {
  const passwordBuffer = Buffer.from(password)
  passwordHashing.hash(passwordBuffer, (error, hashBuffer) => {
    /* istanbul ignore if */
    if (error) return callback(error)
    callback(null, hashBuffer.toString('hex'))
  })
}
