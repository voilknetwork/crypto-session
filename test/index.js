'use strict'

const request = require('supertest')
const crypto = require('crypto')
const session = require('..')
const koa = require('koa')
require('should')

const algorithm = 'aes-256-cbc'
const crypto_key = new Buffer('exiKdyF+IwRIXJDmtGIl4vWUz4i3eVSISpfZoeYc0s4=', 'base64')

describe('koa crypto session', function() {
  describe('and not expire', function() {
    it('should not expire the session', function(done) {
      let app = genApp({
        algorithm,
        crypto_key,
        maxAge: 100,
      })

      app.use(function* () {
        if (this.method === 'POST') {
          this.session.message = 'hi'
          this.body = 200
          return
        }

        this.body = this.session.message
      })

      let server = app.listen()

      request(server)
        .post('/')
        .expect('Set-Cookie', /koa:sess/)
        .end(function(err, res) {
          if (err) return done(err)

          let cookie = res.headers['set-cookie'].join(';')
          const ciphertext = cookie.split(';', 1)[0].substring(cookie.indexOf('=') + 1)
          decode(ciphertext).message.should.equal('hi')

          request(server)
            .get('/')
            .set('cookie', cookie)
            .expect('hi', done)
        })
    })
  })

  describe('and expired', function() {
    it('should expire the sess', function(done) {
      let app = genApp({
        algorithm,
        crypto_key,
        maxAge: 100,
      })

      app.use(function* () {
        if (this.method === 'POST') {
          this.session.message = 'hi'
          this.status = 200
          return
        }

        this.body = this.session.message || ''
      })

      let server = app.listen()

      request(server)
        .post('/')
        .expect('Set-Cookie', /koa:sess/)
        .end(function(err, res) {
          if (err) return done(err)
          let cookie = res.headers['set-cookie'].join(';') // TODO, why the join?
          // koa:sess=Y3Zk...bg== 95fP...c3Y=; path=/; expires=Tue, 25 Oct 2016 18:49:21 GMT; ...
          const ciphertext = cookie.split(';', 1)[0].substring(cookie.indexOf('=') + 1)
          decode(ciphertext).message.should.equal('hi')

          setTimeout(function() {
            request(server)
              .get('/')
              .set('cookie', cookie)
              .expect('', done)
          }, 200)
        })
    })
  })
})

function genApp(options) {
  let app = koa()
  app.keys = ['a', 'b']
  session(app, options)

  return app
}

function decode(text) {
  const plaintext = session.unitTest_decrypt(text, crypto_key, algorithm)
  let body = new Buffer(plaintext, 'base64').toString('utf8')
  return JSON.parse(body)
}
