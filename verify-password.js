const expired = require('../util/expired')
const indexes = require('../indexes')
const passwordHashing = require('./password-hashing')
const securePassword = require('secure-password')

module.exports = (handle, password, callback) => {
  const file = indexes.account.filePath(handle)
  indexes.lock(file, unlock => {
    callback = unlock(callback)
    indexes.account.readWithoutLocking(handle, function (error, account) {
      if (error) {
        error.statusCode = 500
        return callback(error)
      }
      if (account === null || account.confirmed === false) {
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
        passwordBuffer, passwordHash, (error, result) => {
          if (error) {
            error.statusCode = 500
            return callback(error)
          }
          switch (result) {
            case securePassword.INVALID_UNRECOGNIZED_HASH:
              var unrecognized = new Error('unrecognized hash')
              unrecognized.statusCode = 500
              return callback(unrecognized)
            case securePassword.INVALID:
              var invalid = new Error('invalid handle or password')
              invalid.statusCode = 403
              return callback(invalid, account)
            case securePassword.VALID_NEEDS_REHASH:
              return passwordHashing.hash(passwordBuffer, (error, newHash) => {
                if (error) {
                  error.statusCode = 500
                  return callback(error)
                }
                account.passwordHash = newHash.toString('hex')
                indexes.account.writeWithoutLocking(handle, account, error => {
                  if (error) return callback(error)
                  callback(null, account)
                })
              })
            case securePassword.VALID:
              return callback(null, account)
            default:
              var otherError = new Error(
                'unexpected password hash result: ' + result
              )
              otherError.statusCode = 500
              return callback(otherError)
          }
        }
      )
    })
  })
}
