// Verify submitted passwords against stored hashes.

const assert = require('assert')
const expired = require('../expired')
const scheme = require('./scheme')
const securePassword = require('secure-password')
const storage = require('../storage')

module.exports = (handle, password, callback) => {
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  assert(typeof callback === 'function')
  const key = storage.account.key(handle)
  storage.lock(key, unlock => {
    callback = unlock(callback)
    storage.account.readWithoutLocking(handle, function (error, account) {
      /* istanbul ignore next */
      if (error) {
        error.statusCode = 500
        return callback(error)
      }
      if (!account || account.confirmed === false) {
        const invalidError = new Error('invalid handle or password')
        invalidError.statusCode = 401
        return callback(invalidError, account)
      }
      const locked = account.locked
      if (locked && !expired.accountLock(locked)) {
        const lockedError = new Error('account locked')
        lockedError.statusCode = 401
        return callback(lockedError, account)
      }
      const passwordHash = Buffer.from(account.passwordHash, 'hex')
      const passwordBuffer = Buffer.from(password, 'utf8')
      scheme.verify(
        passwordBuffer, passwordHash, (verifyError, result) => {
          /* istanbul ignore next */
          if (verifyError) {
            verifyError.statusCode = 500
            return callback(verifyError)
          }
          let error
          switch (result) {
            /* istanbul ignore next */
            case securePassword.INVALID_UNRECOGNIZED_HASH:
              error = new Error('unrecognized hash')
              error.statusCode = 500
              return callback(error)
            case securePassword.INVALID:
              error = new Error('invalid handle or password')
              error.statusCode = 403
              return callback(error, account)
            /* istanbul ignore next */
            case securePassword.VALID_NEEDS_REHASH:
              return scheme.hash(passwordBuffer, (error, newHash) => {
                if (error) {
                  error.statusCode = 500
                  return callback(error)
                }
                account.passwordHash = newHash.toString('hex')
                storage.account.writeWithoutLocking(handle, account, error => {
                  if (error) return callback(error)
                  callback(null, account)
                })
              })
            case securePassword.VALID:
              return callback(null, account)
            /* istanbul ignore next */
            default:
              error = new Error(
                'unexpected password hash result: ' + result
              )
              error.statusCode = 500
              return callback(error)
          }
        }
      )
    })
  })
}
