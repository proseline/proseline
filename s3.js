// The S3 module provides a simplified wrapper around the
// remote API for S3-compatible data stores.
//
// In production, the module talks to the data store
// specified by environment variables.
//
// In testing, the module stores data in memory.

import assert from 'assert'
import AWS from 'aws-sdk'

export const DELIMITER = '/'

let first, deleteObject, getObject, putObject, listObjects, exists, clear

/* istanbul ignore else */
if (process.env.NODE_ENV === 'production') {
  const Delimiter = DELIMITER
  const Bucket = process.env.S3_BUCKET
  const ServerSideEncryption = 'AES256'

  const s3 = new AWS.S3({
    // Explicit specifying the S3 endpoint allows this module
    // to connect to other S3-compatible data stores, like
    // DigitalOcean spaces or Backblaze.
    endpoint: new AWS.Endpoint(process.env.S3_ENDPOINT),
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  })

  first = (prefix, callback) => {
    assert(typeof prefix === 'string')
    assert(typeof callback === 'function')
    s3.listObjects({
      Bucket,
      Delimiter,
      Prefix: prefix,
      MaxKeys: 1
    }, (error, data) => {
      if (error) {
        if (error.code === 'NoSuchKey') return callback(null, 0)
        return callback(error)
      }
      const contents = data.Contents
      if (contents.length === 0) return callback(null, undefined)
      callback(null, contents[0].Key)
    })
  }

  deleteObject = (key, callback) => {
    assert(typeof key === 'string')
    assert(typeof callback === 'function')
    s3.deleteObject({ Bucket, Key: key }, callback)
  }

  getObject = (key, callback) => {
    assert(typeof key === 'string')
    assert(typeof callback === 'function')
    s3.getObject({ Bucket, Key: key }, (error, data) => {
      if (error) {
        if (error.code === 'NoSuchKey') return callback(null, undefined)
        return callback(error)
      }
      let parsed
      try {
        parsed = JSON.parse(data.Body)
      } catch (error) {
        return callback(error)
      }
      callback(null, parsed)
    })
  }

  putObject = (key, value, callback) => {
    assert(typeof key === 'string')
    assert(value !== undefined)
    assert(typeof callback === 'function')
    s3.putObject({
      Bucket,
      Key: key,
      Body: Buffer.from(JSON.stringify(value)),
      ContentType: 'application/json',
      ServerSideEncryption
    }, error => {
      if (error) return callback(error)
      callback(null, true)
    })
  }

  listObjects = (prefix, callback) => {
    assert(typeof prefix === 'string')
    assert(typeof callback === 'function')
    recurse(false, callback)
    function recurse (marker, done) {
      const options = { Bucket, Delimiter, Prefix: prefix }
      if (marker) options.Marker = marker
      s3.listObjects(options, (error, data) => {
        if (error) {
          if (error.code === 'NoSuchKey') return callback(null, [])
          return callback(error)
        }
        const contents = data.Contents.map(element => element.Key)
        if (data.IsTruncated) {
          return recurse(data.NextMarker, (error, after) => {
            if (error) return done(error)
            done(null, contents.concat(after))
          })
        }
        done(null, contents)
      })
    }
  }

  exists = (key, callback) => {
    assert(typeof key === 'string')
    assert(typeof callback === 'function')
    s3.headObject({ Bucket, Key: key }, (error, data) => {
      if (error) {
        if (error.code === 'NotFound') return callback(null, false)
        return callback(error)
      }
      callback(null, true)
    })
  }
} else {
  // This in-memory Map stores all of the data.
  let data
  clear = () => { data = new Map() }
  clear()

  first = (prefix, callback) => {
    assert(typeof prefix === 'string')
    assert(typeof callback === 'function')
    setImmediate(() => {
      const key = Array.from(data.keys())
        .sort()
        .find(key => key.startsWith(prefix))
      callback(null, key)
    })
  }

  deleteObject = (key, callback) => {
    assert(typeof key === 'string')
    assert(typeof callback === 'function')
    setImmediate(() => {
      data.delete(key)
      callback()
    })
  }

  getObject = (key, callback) => {
    assert(typeof key === 'string')
    assert(typeof callback === 'function')
    setImmediate(() => {
      if (!data.has(key)) return callback(null, undefined)
      callback(null, data.get(key))
    })
  }

  putObject = (key, value, callback) => {
    assert(typeof key === 'string')
    assert(value !== undefined)
    assert(typeof callback === 'function')
    setImmediate(() => {
      data.set(key, value)
      callback(null, true)
    })
  }

  listObjects = (prefix, callback) => {
    assert(typeof prefix === 'string')
    assert(typeof callback === 'function')
    setImmediate(() => {
      const keys = Array.from(data.keys())
        .sort()
        .filter(key => key.startsWith(prefix))
      callback(null, keys)
    })
  }

  exists = (key, callback) => {
    assert(typeof key === 'string')
    assert(typeof callback === 'function')
    setImmediate(() => {
      callback(null, data.has(key))
    })
  }
}

export {
  first,
  deleteObject,
  getObject,
  putObject,
  listObjects,
  exists,
  clear
}
