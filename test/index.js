'use strict'

const request = require('supertest')
const crypto = require('crypto')
const session = require('..')
const koa = require('koa')
require('should')

describe('koa crypto session', function() {
  describe('and not expire', function() {
    it('should not expire the session', function(done) {
      let app = genApp({
        maxAge: 100
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
          decode(cookie.split(';')[0].split('=')[1]).message.should.equal('hi')

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
        maxAge: 100
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
          let cookie = res.headers['set-cookie'].join(';')
          decode(cookie.split(';')[0].split('=')[1]).message.should.equal('hi')

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

let key = new Buffer('8734628jhsifud92')
let iv = new Buffer('cvdgfjf1837483jn')
let algorithm = 'aes-128-cbc'

function decrypt(text) {
  let decipher = crypto.createDecipheriv(algorithm, key, iv)
  let dec = decipher.update(text, 'base64', 'utf8')
  dec += decipher.final('utf8')

  return dec
}

function decode(text) {
  let body = new Buffer(decrypt(text), 'base64').toString('utf8')
  return JSON.parse(body)
}
