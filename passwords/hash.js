// Hash passwords for server-side storage.

import scheme from './scheme.js'

export default (password, callback) => {
  const passwordBuffer = Buffer.from(password)
  scheme.hash(passwordBuffer, (error, hashBuffer) => {
    /* istanbul ignore if */
    if (error) return callback(error)
    callback(null, hashBuffer.toString('hex'))
  })
}
