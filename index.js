'use strict'

const session = require('koa-session')
const crypto = require('crypto')

module.exports = function(app, opts) {
  opts = opts || {}

  if (opts.signed === undefined) {
    opts.signed = true
  }

  let key = opts.key || new Buffer('8734628jhsifud92')
  let iv = opts.iv || new Buffer('cvdgfjf1837483jn')
  let algorithm = opts.algorithm || 'aes-128-cbc'

  opts.encode = encode
  opts.decode = decode

  app.use(session(app, opts))

  /**
   * utils
   */

  function encrypt(text) {
    let cipher = crypto.createCipheriv(algorithm, key, iv)
    let crypted = cipher.update(text, 'utf8', 'base64')
    crypted += cipher.final('base64')

    return crypted
  }

  function decrypt(text) {
    let decipher = crypto.createDecipheriv(algorithm, key, iv)
    let dec = decipher.update(text, 'base64', 'utf8')
    dec += decipher.final('utf8')

    return dec
  }

  function encode(body) {
    body = JSON.stringify(body)
    let base64 = new Buffer(body).toString('base64')

    return encrypt(base64)
  }

  function decode(text) {
    let body = new Buffer(decrypt(text), 'base64').toString('utf8')
    let json = JSON.parse(body)

    // check if the cookie is expired
    if (!json._expire) return null
    if (json._expire < Date.now()) return null

    return json
  }
}
