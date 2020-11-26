const assert = require('assert')
const expired = require('./expired')
const storage = require('./storage')
const passwordHashing = require('./password-hashing')
const securePassword = require('secure-password')

module.exports = (handle, password, callback) => {
  assert(typeof handle === 'string')
  assert(typeof password === 'string')
  assert(typeof callback === 'function')
  const file = storage.account.key(handle)
  storage.lock(file, unlock => {
    callback = unlock(callback)
    storage.account.readWithoutLocking(handle, function (error, account) {
      /* istanbul ignore next */
      if (error) {
        error.statusCode = 500
        return callback(error)
      }
      if (!account || account.confirmed === false) {
        const invalid = new Error('invalid handle or password')
        invalid.statusCode = 401
        return callback(invalid, account)
      }
      const locked = account.locked
      if (locked && !expired.accountLock(locked)) {
        const locked = new Error('account locked')
        locked.statusCode = 401
        return callback(locked, account)
      }
      const passwordHash = Buffer.from(account.passwordHash, 'hex')
      const passwordBuffer = Buffer.from(password, 'utf8')
      passwordHashing.verify(
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
              return passwordHashing.hash(passwordBuffer, (error, newHash) => {
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
