// The S3 module provides a simplified wrapper around the
// remote API for S3-compatible data stores.
//
// In production, the module talks to the data store
// specified by environment variables.
//
// In testing, the module stores data in memory.

/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') {
  module.exports = require('./test')
} else {
  module.exports = require('./production')
}
