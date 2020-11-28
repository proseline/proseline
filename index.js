// Route and handle HTTP requests.

const Busboy = require('busboy')
const cookie = require('cookie')
const crypto = require('./crypto')
const csrf = require('./csrf')
const displayDate = require('./display-date')
const doNotCache = require('do-not-cache')
const escapeHTML = require('escape-html')
const fs = require('fs')
const hashPassword = require('./passwords/hash')
const html = require('./html')
const mail = require('./mail')
const notify = require('./notify')
const parseURL = require('url-parse')
const path = require('path')
const runAuto = require('run-auto')
const runParallel = require('run-parallel')
const runParallelLimit = require('run-parallel-limit')
const runSeries = require('run-series')
const simpleConcatLimit = require('simple-concat-limit')
const storage = require('./storage')
const uuid = require('uuid')
const verifyPassword = require('./passwords/verify')

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const inProduction = process.env.NODE_ENV === 'production'

const brandName = 'Proseline'
const tagline = 'write nice with others'

const simpleRoutes = new Map() // pathname -> f(request, response)
const patternRoutes = []
function route (path, handler) {
  if (Object.prototype.toString.call(path) === '[object RegExp]') {
    patternRoutes.push([path, handler])
  } else {
    simpleRoutes.set(path, handler)
  }
}

module.exports = (request, response) => {
  const parsed = request.parsed = parseURL(request.url, true)
  authenticate(request, response, () => {
    const pathname = parsed.pathname
    const simpleRoute = simpleRoutes.get(pathname)
    if (simpleRoute) return simpleRoute(request, response)
    for (let index = 0; index < patternRoutes.length; index++) {
      const route = patternRoutes[index]
      const match = route[0].exec(pathname)
      if (match) {
        request.match = match
        return route[1](request, response)
      }
    }
    serve404(request, response)
  })
}

// Partials
const socialImage = `${process.env.BASE_HREF}/logo-500.png`

const meta = html`
<meta charset=UTF-8>
<meta name=viewport content="width=device-width, initial-scale=1">
<link href=/styles.css rel=stylesheet>
`

const socialMeta = html`
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${brandName}">
<meta name="twitter:description" content="${tagline}">
<meta name="twitter:image" content="${socialImage}">
<meta name="twitter:creator" content="@artlessdevices">
<meta name="og:type" content="website">
<meta name="og:title" content="${brandName}">
<meta name="og:description" content="${tagline}">
<meta name="og:image" content="${socialImage}">
<meta name="og:site_name" content="${brandName}">
`

const titleSuffix = ` / ${brandName}`

const header = html`
<header role=banner>
  <a class=logo href=/><img src=/logo.svg alt=logo></a>
  <h1>${brandName}</h1>
  <p class=tagline>${tagline}</p>
</header>`

const footer = html`
<footer role=contentinfo>
  <p>a service of <a href=https://artlessdevices.com>Artless Devices</a></p>
</footer>
`

function nav (request) {
  const account = request.account
  const handle = account && account.handle
  return html`
<nav role=navigation>
  ${!handle && '<a id=login class=button href=/login>Log In</a>'}
  ${!handle && '<a id=signup class=button href=/signup>Sign Up</a>'}
  ${handle && logoutButton(request)}
</nav>
  `
}

function subscribeButton (request) {
  const action = '/subscribe'
  const csrfInputs = csrf.inputs({
    action,
    sessionID: request.session.id
  })
  return html`
<form action=${action} method=post>
  ${csrfInputs}
  <button id=subscribe type=submit>Subscribe</button>
</form>
  `
}

function manageSubscriptionButton (request) {
  const action = '/subscription'
  const csrfInputs = csrf.inputs({
    action,
    sessionID: request.session.id
  })
  return html`
<form action=${action} method=post>
  ${csrfInputs}
  <button id=subscription type=submit>Manage Subscription</button>
</form>
  `
}

function logoutButton (request) {
  const csrfInputs = csrf.inputs({
    action: '/logout',
    sessionID: request.session.id
  })
  return html`
<form
    id=logoutForm
    action=/logout
    method=post>
  ${csrfInputs}
  <button id=logout type=submit>Log Out</button>
</form>
  `
}

// Routes

route('/', (request, response) => {
  if (request.method !== 'GET') return serve405(request, response)
  doNotCache(response)
  const { account } = request
  const tasks = {}
  if (request.account) {
    const { handle } = account
    tasks.projects = done => storage.accountProject.list(
      handle,
      (error, discoveryKeys) => {
        if (error) return done(error)
        runParallelLimit(
          discoveryKeys.map(key => done => storage.accountProject.read(handle, key, done)),
          3,
          done
        )
      }
    )
  }
  runParallel(tasks, (error, data) => {
    if (error) return serve500(request, response, error)
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    ${socialMeta}
    <title>${brandName}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      ${account && projectsList(account, data.projects)}
      ${account && accountInfo(request)}
    </main>
    ${footer}
  </body>
</html>
    `)
  })
})

function accountInfo (request) {
  const { account } = request
  return html`
<h2>Account</h2>
<table>
  <tr>
    <th>Handle</th>
    <td class=handle>${escapeHTML(account.handle)}</td>
  </tr>
  <tr>
    <th>E-Mail</th>
    <td class=email>${escapeHTML(account.email)}</td>
  </tr>
  <tr>
    <th>Member Since</th>
    <td class=signedup>${displayDate(account.created)}</td>
  </tr>
</table>
${account.subscriptionID && manageSubscriptionButton(request)}
${!account.subscriptionID && subscribeButton(request)}
<a class=button href=/password>Change Password</a>
<a class=button href=/email>Change E-Mail</a>
  `
}

function projectsList (account, projects) {
  projects.sort((a, b) => a.created.localeCompare(b.created))
  return html`
<h2>Projects</h2>
<ul>
  <li>${account.subscriptionID && '<a id=project class=button href=/projects>New Project</a>'}</li>
  ${projects.map(project => html`
  <li><a href="/projects/${project.discoveryKey}">${project.title}</a></li>
  `)}
</ul>
  `
}

route('/styles.css', (request, response) => {
  const file = path.join(__dirname, 'styles.css')
  response.setHeader('Content-Type', 'text/css')
  fs.createReadStream(file).pipe(response)
})

route('/logo.svg', (request, response) => {
  const file = path.join(__dirname, 'logo.svg')
  response.setHeader('Content-Type', 'image/svg+xml')
  fs.createReadStream(file).pipe(response)
})

// https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/

const handles = (() => {
  const pattern = '^[a-z0-9]{3,16}$'
  const re = new RegExp(pattern)
  return {
    pattern,
    validate: string => re.test(string),
    html: 'Handles must be ' +
      'made of the characters ‘a’ through ‘z’ ' +
      'and the digits ‘0’ through ‘9’. ' +
      'They must be at least three characters long, ' +
      'but no more than sixteen.'
  }
})()

const passwords = (() => {
  const min = 8
  const max = 64
  const pattern = exports.pattern = `^.{${min},${max}}$`
  const re = new RegExp(pattern)
  return {
    pattern,
    validate: string => {
      if (!re.test(string)) return false
      const length = string.length
      return length >= min && length <= max
    },
    html: 'Passwords must be ' +
      `at least ${min} characters, ` +
      `and no more than ${max}.`
  }
})()

route('/signup', (request, response) => {
  const title = 'Sign Up'

  const fields = {
    email: {
      filter: e => e.toLowerCase().trim(),
      validate: e => EMAIL_RE.test(e)
    },
    handle: {
      filter: e => e.toLowerCase().trim(),
      validate: handles.validate
    },
    password: {
      validate: passwords.validate
    },
    repeat: {
      validate: (value, body) => value === body.password
    }
  }

  formRoute({
    action: '/signup',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function processBody (request, body, done) {
    const { handle, email, password } = body
    runSeries([
      done => {
        storage.account.exists(handle, (error, exists) => {
          if (error) return done(error)
          if (exists) {
            const error = new Error('handle taken')
            error.statusCode = 400
            return done(error)
          }
          done()
        })
      },
      done => {
        storage.email.read(email, (error, handle) => {
          if (error) return done(error)
          if (!handle) return done()
          const hasAccount = new Error('e-mail address has an account')
          hasAccount.hasAccount = true
          hasAccount.statusCode = 401
          hasAccount.fieldName = 'email'
          done(hasAccount)
        })
      },
      done => {
        hashPassword(password, (error, passwordHash) => {
          if (error) return done(error)
          runSeries([
            done => {
              storage.account.write(handle, {
                handle,
                email,
                passwordHash,
                created: new Date().toISOString(),
                keyPair: crypto.keyPair(),
                confirmed: false,
                failures: 0,
                locked: false
              }, done)
            },
            done => {
              storage.email.write(email, handle, done)
            }
          ], error => {
            if (error) return done(error)
            request.log.info('recorded account')
            done()
          })
        })
      },
      done => {
        const token = uuid.v4()
        storage.token.write(token, {
          action: 'confirm',
          created: new Date().toISOString(),
          handle,
          email
        }, error => {
          if (error) return done(error)
          request.log.info('recorded token')
          notify.confirmAccount({
            to: email,
            handle,
            url: `${process.env.BASE_HREF}/confirm?token=${token}`
          }, error => {
            if (error) return done(error)
            request.log.info('e-mailed token')
            done()
          })
        })
      },
      done => {
        if (!process.env.ADMIN_EMAIL) return done()
        mail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Sign Up',
          text: `Handle: ${handle}\nE-Mail: ${email}\n`
        }, error => {
          if (error) {
            if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
              request.log.info(error)
            } else {
              request.log.error(error)
            }
          }
          done()
        })
      }
    ], done)
  }

  function onSuccess (request, response) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>Success</h2>
      <p class=message>Check your e-mail for a link to confirm your new account.</p>
    </main>
    ${footer}
  </body>
</html>
  `)
  }

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <form id=signupForm method=post>
        ${data.error}
        ${data.csrf}
        ${eMailInput({
          autofocus: true,
          value: data.email.value
        })}
        ${data.email.error}
        <p>
          <label for=handle>Handle</label>
          <input
              name=handle
              type=text
              pattern="${handles.pattern}"
              value="${escapeHTML(data.handle.value)}"
              autofocus
              required>
        </p>
        ${data.handle.error}
        <p>${handles.html}</p>
        ${passwordInput({})}
        ${data.password.error}
        ${passwordRepeatInput()}
        ${data.repeat.error}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
})

route('/login', (request, response) => {
  const title = 'Log In'

  const fields = {
    handle: {
      filter: (e) => e.toLowerCase().trim(),
      validate: x => x.length !== 0
    },
    password: {
      validate: x => x.length !== 0
    }
  }

  module.exports = formRoute({
    action: '/login',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <form id=loginForm method=post>
        ${data.error}
        ${data.csrf}
        <p>
          <label for=handle>Handle</label>
          <input name=handle type=text required autofocus>
        </p>
        ${data.handle.error}
        <p>
          <label for=password>Password</label>
          <input name=password type=password required>
        </p>
        ${data.password.error}
        <button type=submit>${title}</button>
      </form>
      <a href=/handle>Forgot Handle</a>
      <a href=/reset>Reset Password</a>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function processBody (request, { handle, password }, done) {
    let sessionID
    runSeries([
      authenticate,
      createSession
    ], error => {
      if (error) return done(error)
      done(null, sessionID)
    })

    function authenticate (done) {
      verifyPassword(handle, password, (verifyError, account) => {
        if (verifyError) {
          const statusCode = verifyError.statusCode
          if (statusCode === 500) return done(verifyError)
          if (!account) return done(verifyError)
          request.log.info(verifyError, 'bad password')
          const failures = account.failures + 1
          if (failures >= 5) {
            return storage.account.update(handle, {
              locked: new Date().toISOString(),
              failures: 0
            }, recordError => {
              if (recordError) return done(recordError)
              done(verifyError)
            })
          }
          return storage.account.update(
            handle, { failures },
            (updateError) => {
              if (updateError) return done(updateError)
              done(verifyError)
            }
          )
        }
        request.log.info('verified credentials')
        done()
      })
    }

    function createSession (done) {
      sessionID = uuid.v4()
      storage.session.write(sessionID, {
        id: sessionID,
        handle,
        created: new Date().toISOString()
      }, (error, success) => {
        if (error) return done(error)
        if (!success) return done(new Error('session collision'))
        request.log.info({ id: sessionID }, 'recorded session')
        done()
      })
    }
  }

  function onSuccess (request, response, body, sessionID) {
    const expires = new Date(
      Date.now() + (30 * 24 * 60 * 60 * 1000) // thirty days
    )
    setCookie(response, sessionID, expires)
    request.log.info({ expires }, 'set cookie')
    serve303(request, response, '/')
  }
})

route('/logout', (request, response) => {
  if (request.method !== 'POST') {
    return serve405(request, response)
  }
  const body = {}
  const fields = csrf.names
  request.pipe(
    new Busboy({
      headers: request.headers,
      limits: {
        fieldNameSize: Math.max(fields.map(n => n.length)),
        fields: 2,
        parts: 1
      }
    })
      .on('field', function (name, value, truncated, encoding, mime) {
        if (fields.includes(name)) body[name] = value
      })
      .once('finish', onceParsed)
  )

  function onceParsed () {
    csrf.verify({
      action: '/logout',
      sessionID: request.session.id,
      token: body[csrf.tokenName],
      nonce: body[csrf.nonceName]
    }, error => {
      if (error) return redirect()
      clearCookie(response)
      redirect()
    })
  }

  function redirect () {
    response.statusCode = 303
    response.setHeader('Location', '/')
    response.end()
  }
})

route('/handle', (request, response) => {
  const title = 'Forgot Handle'

  const fields = {
    email: {
      filter: (e) => e.toLowerCase().trim(),
      validate: (e) => EMAIL_RE.test(e)
    }
  }

  formRoute({
    action: '/handle',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>Forgot Handle</h2>
      <form id=handleForm method=post>
        ${data.error}
        ${data.csrf}
        <p>
          <label for=email>E-Mail</label>
          <input
              name=email
              type=email
              required
              autofocus
              autocomplete=off>
        </p>
        ${data.email.error}
        <button type=submit>Send Handle</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function onSuccess (request, response, body) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>Forgot Handle${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>Forgot Handle</h2>
      <p class=message>If the e-mail you entered corresponds to an account, an e-mail was just sent to it.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  }

  function processBody (request, body, done) {
    const email = body.email
    storage.email.read(email, (error, handle) => {
      if (error) return done(error)
      if (!handle) return done()
      notify.handleReminder({
        to: email,
        handle
      }, done)
    })
  }
})

route('/email', (request, response) => {
  const title = 'Change E-Mail'

  const fields = {
    email: {
      filter: (e) => e.toLowerCase().trim(),
      validate: (e) => EMAIL_RE.test(e)
    }
  }

  formRoute({
    action: '/email',
    requireAuthentication: true,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>Change E-Mail</h2>
      <form id=emailForm method=post>
        ${data.error}
        ${data.csrf}
        ${eMailInput({ autofocus: true })}
        ${data.email.error}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function onSuccess (request, response, body) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>Change E-Mail</h2>
      <p class=message>Confirmation e-mail sent.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  }

  function processBody (request, body, done) {
    const handle = request.account.handle
    const email = body.email
    storage.email.read(email, (error, existingHandle) => {
      if (error) return done(error)
      if (existingHandle) {
        const error = new Error('e-mail already has an account')
        error.fieldName = 'email'
        error.statusCode = 400
        return done(error)
      }
      const token = uuid.v4()
      storage.token.write(token, {
        action: 'email',
        created: new Date().toISOString(),
        handle,
        email
      }, error => {
        if (error) return done(error)
        request.log.info({ token }, 'e-mail change token')
        notify.confirmEMailChange({
          to: email,
          url: `${process.env.BASE_HREF}/confirm?token=${token}`
        }, done)
      })
    })
  }
})

route('/password', (request, response) => {
  const method = request.method
  if (method === 'GET') return getPassword(request, response)
  if (method === 'POST') return postPassword(request, response)
  response.statusCode = 405
  response.end()
})

function getPassword (request, response) {
  if (request.parsed.query.token) return getWithToken(request, response)
  getAuthenticated(request, response)
}

function getAuthenticated (request, response) {
  const handle = request.account && request.account.handle
  if (!handle) {
    response.statusCode = 401
    response.end()
    return
  }
  const title = 'Change Password'
  const message = request.parsed.query.message
  const messageParagraph = message
    ? `<p class=message>${escapeHTML(message)}</p>`
    : ''
  response.setHeader('Content-Type', 'text/html')
  response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      ${messageParagraph}
      <form id=passwordForm method=post>
        ${csrf.inputs({
          action: '/password',
          sessionID: request.session.id
        })}
        <p>
          <label for=old>Old Password</label>
          <input name=old type=password required autofocus autocomplete=off>
        </p>
        ${passwordInput({ label: 'New Password' })}
        ${passwordRepeatInput()}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function getWithToken (request, response) {
  const token = request.parsed.query.token
  if (!UUID_RE.test(token)) {
    return invalidToken(request, response)
  }
  storage.token.read(token, (error, tokenData) => {
    if (error) return serve500(request, response, error)
    if (!tokenData) return invalidToken(request, response)
    if (tokenData.action !== 'reset') {
      response.statusCode = 400
      return response.end()
    }
    const title = 'Change Password'
    const message = request.parsed.query.message || error
    const messageParagraph = message
      ? `<p class=message>${escapeHTML(message)}</p>`
      : ''
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      ${messageParagraph}
      <form id=passwordForm method=post>
        ${csrf.inputs({
          action: '/password',
          sessionID: request.session.id
        })}
        <input type=hidden name=token value="${token}">
        ${passwordInput({
          label: 'New Password',
          autofocus: true
        })}
        ${passwordRepeatInput()}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  })
}

function invalidToken (request, response) {
  const title = 'Change Password'
  response.statusCode = 400
  response.setHeader('Content-Type', 'text/html')
  return response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>The link you followed is invalid or expired.</p>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function postPassword (request, response) {
  let handle
  const body = {}
  const fieldNames = ['password', 'repeat', 'token', 'old']
  fieldNames.push(...csrf.names)
  runSeries([
    readPostBody,
    validateInputs,
    checkOldPassword,
    changePassword,
    sendEMail
  ], function (error) {
    if (error) {
      if (error.statusCode === 400) {
        response.statusCode = 400
        return getPassword(request, response, error.message)
      }
      request.log.error(error)
      response.statusCode = error.statusCode || 500
      return response.end()
    }
    const title = 'Change Password'
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>Password changed.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  })

  function readPostBody (done) {
    request.pipe(
      new Busboy({
        headers: request.headers,
        limits: {
          fieldNameSize: Math.max(fieldNames.map(x => x.length)),
          fields: fieldNames.length,
          parts: 1
        }
      })
        .on('field', function (name, value, truncated, encoding, mime) {
          if (fieldNames.includes(name)) body[name] = value
        })
        .once('finish', done)
    )
  }

  function validateInputs (done) {
    let error
    const token = body.token
    if (token && !UUID_RE.test(token)) {
      error = new Error('invalid token')
      error.fieldName = 'token'
      return done(error)
    }
    const password = body.password
    const repeat = body.repeat
    if (password !== repeat) {
      error = new Error('passwords did not match')
      error.fieldName = 'repeat'
      return done(error)
    }
    if (!passwords.validate(password)) {
      error = new Error('invalid password')
      error.fieldName = 'password'
      return done(error)
    }
    const old = body.old
    if (!token && !old) {
      error = new Error('missing old password')
      error.fieldName = 'old'
      return done(error)
    }
    csrf.verify({
      action: '/password',
      sessionID: request.session.id,
      token: body[csrf.tokenName],
      nonce: body[csrf.nonceName]
    }, done)
  }

  function checkOldPassword (done) {
    const token = body.token
    if (token) return done()
    if (!request.account) {
      const unauthorized = new Error('unauthorized')
      unauthorized.statusCode = 401
      return done(unauthorized)
    }
    handle = request.account.handle
    verifyPassword(handle, body.old, error => {
      if (error) {
        const invalidOldPassword = new Error('invalid password')
        invalidOldPassword.statusCode = 400
        return done(invalidOldPassword)
      }
      return done()
    })
  }

  function changePassword (done) {
    const token = body.token
    if (token) {
      return storage.token.read(token, (error, tokenData) => {
        if (error) return done(error)
        if (!tokenData || tokenData.action !== 'reset') {
          const failed = new Error('invalid token')
          failed.statusCode = 401
          return done(failed)
        }
        storage.token.use(token, error => {
          if (error) return done(error)
          handle = tokenData.handle
          recordChange()
        })
      })
    }

    recordChange()

    function recordChange () {
      hashPassword(body.password, (error, passwordHash) => {
        if (error) return done(error)
        storage.account.update(handle, { passwordHash }, done)
      })
    }
  }

  function sendEMail (done) {
    storage.account.read(handle, (error, account) => {
      if (error) return done(error)
      notify.passwordChanged({
        to: account.email,
        handle
      }, error => {
        // Log and eat errors.
        if (error) request.log.error(error)
        done()
      })
    })
  }
}

route('/reset', (request, response) => {
  const title = 'Reset Password'

  const fields = {
    handle: {
      validate: handles.validate
    }
  }

  formRoute({
    action: '/reset',
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    return html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <form id=resetForm method=post>
        ${data.error}
        ${data.csrf}
        <p>
          <label for=handle>Handle</label>
          <input
              name=handle
              value="${escapeHTML(data.handle.value)}"
              type=text
              pattern="${escapeHTML(handles.pattern)}"
              required
              autofocus
              autocomplete=off>
        </p>
        ${data.handle.error}
        <button type=submit>Send E-Mail</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `
  }

  function processBody (request, body, done) {
    const handle = body.handle
    storage.account.read(handle, (error, account) => {
      if (error) return done(error)
      if (!account) {
        const invalid = new Error('invalid handle')
        invalid.statusCode = 400
        return done(invalid)
      }
      const token = uuid.v4()
      storage.token.write(token, {
        action: 'reset',
        created: new Date().toISOString(),
        handle
      }, error => {
        if (error) return done(error)
        const url = `${process.env.BASE_HREF}/password?token=${token}`
        notify.passwordReset({
          to: account.email,
          handle,
          url
        }, done)
      })
    })
  }

  function onSuccess (request, response) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    <main role=main>
      <h2>Reset Password</h2>
      <p class=message>An e-mail has been sent.</p>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
})

route('/confirm', (request, response) => {
  if (request.method !== 'GET') {
    return serve405(request, response)
  }

  const token = request.parsed.query.token
  if (!UUID_RE.test(token)) {
    return invalidToken(request, response)
  }

  storage.token.read(token, (error, tokenData) => {
    if (error) return serve500(request, response, error)
    if (!tokenData) return invalidToken(request, response)
    storage.token.use(token, error => {
      if (error) return serve500(request, response, error)
      const action = tokenData.action
      if (action !== 'confirm' && action !== 'email') {
        response.statusCode = 400
        return response.end()
      }
      const handle = tokenData.handle
      if (action === 'confirm') {
        storage.account.confirm(handle, error => {
          if (error) return serve500(request, response, error)
          serve303(request, response, '/login')
        })
      }
      if (action === 'email') {
        const email = tokenData.email
        let oldEMail
        runSeries([
          done => {
            storage.account.read(handle, (error, account) => {
              if (error) return done(error)
              oldEMail = account.email
              done()
            })
          },
          done => storage.account.update(handle, { email }, done),
          done => storage.email.delete(oldEMail, done),
          done => storage.email.write(email, handle, done)
        ], error => {
          if (error) return serve500(request, response, error)
          const title = 'E-Mail Change'
          response.setHeader('Content-Type', 'text/html')
          response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>The e-mail address for your account was successfully changed.</p>
    </main>
    ${footer}
  </body>
</html>
          `)
        })
      }
    })
  })
})

route('/subscribe', (request, response) => {
  const title = 'Subscribe'

  const fields = {}

  formRoute({
    action: '/subscribe',
    requireAuthentication: true,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function processBody (request, body, done) {
    const { email, handle } = request.account
    const alreadyCustomer = Boolean(request.account.customerID)
    let customerID
    const toForm = {}
    runSeries([
      // Create a customer if needed.
      done => {
        if (alreadyCustomer) return done()
        stripe.customers.create({
          email,
          metadata: { handle }
        }, (error, customer) => {
          if (error) return done(error)
          customerID = customer.id
          request.log.info({ customer }, 'created Stripe customer')
          // Save Stripe customer ID to account record.
          storage.account.update(handle, { customerID }, error => {
            if (error) return done(error)
            done()
          })
        })
      },
      // Check for an active subscription.
      done => {
        if (!alreadyCustomer) return done()
        stripe.subscriptions.list({
          customer: customerID,
          plan: process.env.STRIPE_PLAN,
          status: 'active',
          limit: 1
        }, (error, { data: subscriptions }) => {
          if (error) return done(error)
          if (subscriptions.length !== 0) {
            request.log.info({ subscriptions }, 'subscriptions')
            const alreadySubscribed = new Error('already subscribed')
            alreadySubscribed.statusCode = 400
            return done(alreadySubscribed)
          }
          done()
        })
      },
      // Create a Stripe Checkout session.
      done => {
        stripe.checkout.sessions.create({
          customer: customerID,
          payment_method_types: ['card'],
          line_items: [
            {
              price: process.env.STRIPE_PLAN,
              quantity: 1
            }
          ],
          mode: 'subscription',
          allow_promotion_codes: true,
          success_url: `${process.env.BASE_HREF}/subscribed?sessionID={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.BASE_HREF}/subscribe`
        }, (error, session) => {
          if (error) return done(error)
          toForm.sessionID = session.id
          done()
        })
      }
    ], error => {
      if (error) {
        request.log.error(error)
        return done(error)
      }
      done(null, toForm)
    })
  }

  function onSuccess (request, response, body, { sessionID }) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    <script src=https://js.stripe.com/v3/></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => {
        const stripe = Stripe(${JSON.stringify(process.env.STRIPE_PUBLISHABLE_KEY)})
        const sessionId = ${JSON.stringify(sessionID)}
        stripe.redirectToCheckout({ sessionId })
      })
    </script>
  </body>
</html>
    `)
  }

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>Subscribe</h2>
      <form id=subscribeForm method=post>
        ${data.error}
        ${data.csrf}
        <button type=submit>${title}</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
})

route('/subscribed', (request, response) => {
  const title = 'Subscribed'
  response.setHeader('Content-Type', 'text/html')
  response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <p class=message>Thank you for subscribing!</p>
    </main>
    ${footer}
  </body>
</html>
  `)
})

route('/subscription', (request, response) => {
  const title = 'Subscription'

  const fields = { }

  formRoute({
    action: '/subscription',
    requireAuthentication: true,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function processBody (request, body, done) {
    const { customerID } = request.account
    if (!customerID) {
      const notSubscribed = new Error('not subscribed')
      notSubscribed.statusCode = 404
      return done(notSubscribed)
    }
    stripe.billingPortal.sessions.create({
      customer: customerID,
      return_url: `${process.env.BASE_HREF}/`
    }, done)
  }

  function onSuccess (request, response, body, session) {
    response.statusCode = 303
    response.setHeader('Location', session.url)
    response.end()
  }

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <form id=unsubscribeForm method=post>
        ${data.error}
        ${data.csrf}
        <button type=submit>Unsubscribe</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  }
})

route('/projects', (request, response) => {
  const routeTitle = 'New Project'
  const fields = {
    title: { validate: s => s.length > 0 }
  }
  formRoute({
    action: '/projects',
    requireAuthentication: true,
    form,
    fields,
    processBody,
    onSuccess
  })(request, response)

  function form (request, data) {
    response.setHeader('Content-Type', 'text/html')
    response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${routeTitle}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${routeTitle}</h2>
      <form id=projectForm method=post>
        ${data.error}
        ${data.csrf}
        <p>
          <label for=title>Title</label>
          <input
              name=title
              type=text
              required
              value="${escapeHTML(data.title.value)}"
              autofocus>
        </p>
        ${data.title.error}
        <button type=submit>Create Project</button>
      </form>
    </main>
    ${footer}
  </body>
</html>
    `)
  }

  function processBody (request, { title }, done) {
    const handle = request.account.handle
    const created = new Date().toISOString()
    // Generate project keys.
    const distributionKey = crypto.distributionKey()
    const discoveryKey = crypto.discoveryKey(distributionKey)
    const projectKeyPair = crypto.keyPair()
    const encryptionKey = crypto.encryptionKey()
    // Generate journal keys.
    const journalKeyPair = crypto.keyPair()

    runParallel([
      storeProjectKeys,
      addProjectToAccount,
      addJournalToProject,
      publishIntroduction
    ], error => {
      if (error) return done(error)
      done(null, discoveryKey)
    })

    function storeProjectKeys (done) {
      storage.project.write(discoveryKey, {
        discoveryKey,
        distributionKey,
        encryptionKey,
        projectKeyPair,
        created,
        creator: handle
      }, done)
    }

    function addProjectToAccount (done) {
      storage.accountProject.write(handle, discoveryKey, {
        handle,
        discoveryKey,
        title,
        journalKeyPair,
        created
      }, done)
    }

    function addJournalToProject (done) {
      storage.projectJournal.write(
        discoveryKey,
        journalKeyPair.publicKey,
        {
          discoveryKey,
          journalKeyPair,
          handle,
          created
        },
        done
      )
    }

    function publishIntroduction (done) {
      const index = 0
      const entry = {
        version: '1.0.0-pre',
        discoveryKey,
        index,
        type: 'intro',
        name: handle,
        device: 'proseline.com',
        timestamp: new Date().toISOString()
      }
      let envelope
      try {
        envelope = crypto.envelope({
          journalKeyPair,
          projectKeyPair,
          encryptionKey,
          entry
        })
      } catch (error) {
        return done(error)
      }
      storage.entry.write(
        discoveryKey,
        journalKeyPair.publicKey,
        index,
        envelope,
        done
      )
    }
  }

  function onSuccess (request, response, body, discoveryKey) {
    response.statusCode = 303
    response.setHeader('Location', `/projects/${discoveryKey}`)
    response.end()
  }
})

route(
  /^\/projects\/([a-f0-9]{64})$/,
  (request, response) => {
    if (request.method !== 'GET') return serve405(request, response)
    const discoveryKey = request.match[1]
    const tasks = {
      project: done => storage.project.read(discoveryKey, done),
      creatorProject: ['project', (results, done) => {
        storage.accountProject.read(
          results.project.creator,
          discoveryKey,
          done
        )
      }]
    }
    if (request.account) {
      tasks.userProject = ['project', (results, done) => {
        storage.accountProject.read(
          request.account.handle,
          discoveryKey,
          done
        )
      }]
    }
    runAuto(tasks, (error, data) => {
      if (error) {
        if (error.statusCode === 404) {
          return serve404(request, response)
        }
        return serve500(request, response, error)
      }
      const title = data.userProject
        ? data.userProject.title
        : data.creatorProject.title
      response.setHeader('Content-Type', 'text/html')
      response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${tagline}">
    <meta name="twitter:image" content="${socialImage}">
    <meta name="og:title" content="${title}">
    <meta name="og:description" content="${tagline}">
    <meta name="og:image" content="${socialImage}">
    <meta name="og:site_name" content="${brandName}">
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
    </main>
    ${footer}
  </body>
</html>
      `)
    })
  }
)

route('/stripe-webhook', (request, response) => {
  const signature = request.headers['stripe-signature']
  simpleConcatLimit(request, 8192, (error, buffer) => {
    if (error) {
      response.statusCode = 500
      return response.end()
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        buffer, signature, process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (error) {
      return badRequest(error)
    }

    request.log.info({ event }, 'Stripe webhook event')

    const type = event.type
    if (type === 'checkout.session.completed') {
      const object = event.data.object
      const customerID = object.customer
      const subscriptionID = object.subscription
      request.log.info({
        customerID, subscriptionID
      }, 'Stripe Checkout completed')
      return stripe.customers.retrieve(customerID, (error, customer) => {
        if (error) return fail(error)
        request.log.info({ customer }, 'customer')
        if (customer.deleted) {
          request.log.info('Stripe customer deleted')
          return succeed()
        }
        if (!customer.metadata || !customer.metadata.handle) {
          return fail(new Error('customer has no handle metadata'))
        }
        const handle = customer.metadata.handle
        return storage.account.update(
          handle, { subscriptionID },
          error => {
            if (error) return fail(error)
            if (process.env.ADMIN_EMAIL) {
              const email = customer.email
              mail({
                to: process.env.ADMIN_EMAIL,
                subject: 'Subscribed',
                text: `Handle: ${handle}\nE-Mail: ${email}\n`
              }, error => {
                if (error) request.log.warn(error)
              })
            }
            return succeed()
          }
        )
      })
    } else if (type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const subscriptionID = subscription.id
      const customerID = subscription.customer
      request.log.info({
        customerID, subscriptionID
      }, 'Stripe subscription canceled')
      return stripe.customers.retrieve(customerID, (error, customer) => {
        if (error) return fail(error)
        request.log.info({ customer }, 'customer')
        if (customer.deleted) {
          request.log.info('Stripe customer deleted')
          return succeed()
        }
        if (!customer.metadata || !customer.metadata.handle) {
          return fail(new Error('customer has no handle metadata'))
        }
        const handle = customer.metadata.handle
        return storage.account.update(
          handle, { subscriptionID: undefined },
          error => {
            if (error) return fail(error)
            if (process.env.ADMIN_EMAIL) {
              const email = customer.email
              mail({
                to: process.env.ADMIN_EMAIL,
                subject: 'Unsubscribed',
                text: `Handle: ${handle}\nE-Mail: ${email}\n`
              }, error => {
                if (error) request.log.warn(error)
              })
            }
            return succeed()
          }
        )
      })
    }
    badRequest()
  })

  function badRequest (error) {
    if (error) request.log.warn(error)
    response.statusCode = 400
    return response.end()
  }

  function succeed () {
    response.statusCode = 200
    response.end()
  }

  function fail (error) {
    request.log.error(error)
    response.statusCode = 500
    response.end()
  }
})

route('/logo-500.png', servePNG)
route('/logo-1000.png', servePNG)

function servePNG (request, response) {
  const file = path.join(__dirname, request.pathname)
  response.setHeader('Content-Type', 'image/png')
  fs.createReadStream(file).pipe(response)
}

route('/tagline', (request, response) => {
  response.setHeader('Content-Type', 'text/plain')
  return response.end(tagline)
})

route('/robots.txt', (request, response) => {
  response.setHeader('Content-Type', 'text/plain; charset=UTF-8')
  return response.end('User-agent: *\nDisallow: /')
})

route('/public-key', (request, response) => {
  response.setHeader('Content-Type', 'application/octet-stream')
  response.end(process.env.PUBLIC_KEY)
})

if (!inProduction) {
  route('/internal-error', (request, response) => {
    const testError = new Error('test error')
    return serve500(request, response, testError)
  })
}

function setCookie (response, value, expires) {
  response.setHeader(
    'Set-Cookie',
    cookie.serialize('proseline', value, {
      expires,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV !== 'test'
    })
  )
}

function clearCookie (response) {
  setCookie(response, '', new Date('1970-01-01'))
}

function eMailInput ({ value, autofocus }) {
  return html`
<p>
  <label for=email>E-Mail</label>
  <input
      name=email
      type=email
      value="${escapeHTML(value || '')}"
      ${autofocus ? 'autofocus' : ''}
      required>
</p>
  `
}

function passwordInput ({ label, autofocus }) {
  return html`
<p>
  <label for=password>${escapeHTML(label || 'Password')}</label>
  <input
      name=password
      type=password
      required
      autocomplete=off
      ${autofocus ? 'autofocus' : ''}>
</p>
<p>${escapeHTML(passwords.html)}</p>
  `
}

function passwordRepeatInput () {
  return html`
<p>
  <label for=repeat>Repeat</label>
  <input
      name=repeat
      type=password
      pattern="${passwords.pattern}"
      required
      autocomplete=off>
</p>
  `
}

function formRoute ({
  action,
  requireAuthentication,
  loadGETData,
  form,
  fields,
  fieldSizeLimit = 512000,
  processBody,
  onPost,
  onSuccess
}) {
  if (typeof form !== 'function') {
    throw new TypeError('missing form function')
  }

  if (typeof processBody !== 'function') {
    throw new TypeError('missing processBody function')
  }

  if (typeof onSuccess !== 'function') {
    throw new TypeError('missing onSuccess function')
  }

  const fieldNames = Object.keys(fields)
  fieldNames.forEach(fieldName => {
    const description = fields[fieldName]
    if (typeof description.validate !== 'function') {
      throw new TypeError('missing validate function for ' + fieldName)
    }
    if (!description.displayName) {
      description.displayName = fieldName
    }
  })

  return (request, response) => {
    const method = request.method
    const isGet = method === 'GET'
    const isPost = !isGet && method === 'POST'
    if (!isGet && !isPost) return serve405(request, response)
    proceed()

    function proceed () {
      if (requireAuthentication && !request.account) {
        return serve303(request, response, '/login')
      }
      if (isGet) return get(request, response)
      post(request, response)
    }
  }

  function get (request, response, body, error) {
    response.setHeader('Content-Type', 'text/html')
    const data = {}
    if (body) {
      fieldNames.forEach(fieldName => {
        data[fieldName] = {
          value: body[fieldName],
          error: error && error.fieldName === fieldName
            ? `<p class=error>${escapeHTML(error.message)}</p>`
            : ''
        }
      })
    } else {
      fieldNames.forEach(fieldName => {
        data[fieldName] = { value: '', error: false }
      })
    }
    if (error && !error.fieldName) {
      data.error = `<p class=error>${escapeHTML(error.message)}</p>`
    }
    data.csrf = csrf.inputs({
      action,
      sessionID: request.session.id
    })
    if (loadGETData) {
      return loadGETData(request, data, error => {
        if (error) return serve500(request, response, error)
        response.end(form(request, data))
      })
    }
    response.end(form(request, data))
  }

  function post (request, response) {
    if (onPost) onPost(request, response)

    const body = {}
    let fromProcess
    runSeries([
      parse,
      validate,
      process
    ], error => {
      if (error) {
        const statusCode = error.statusCode
        if (statusCode >= 400 && statusCode < 500) {
          response.statusCode = statusCode
          return get(request, response, body, error)
        }
        return serve500(request, response, error)
      }
      onSuccess(request, response, body, fromProcess)
    })

    function parse (done) {
      request.pipe(
        new Busboy({
          headers: request.headers,
          limits: {
            fieldNameSize: Math.max(
              fieldNames
                .concat(csrf.names)
                .map(n => n.length)
            ),
            fields: fieldNames.length + 2,
            fieldSizeLimit,
            parts: 1
          }
        })
          .on('field', function (name, value, truncated, encoding, mime) {
            if (name === csrf.tokenName || name === csrf.nonceName) {
              body[name] = value
              return
            }
            const description = fields[name]
            if (!description) return
            body[name] = description.filter
              ? description.filter(value)
              : value
          })
          .once('finish', done)
      )
    }

    function validate (done) {
      for (let index = 0; index < fieldNames.length; index++) {
        const fieldName = fieldNames[index]
        const description = fields[fieldName]
        const valid = description.validate(body[fieldName], body)
        if (valid) continue
        const error = new Error('invalid ' + description.displayName)
        error.statusCode = 401
        return done(error)
      }
      csrf.verify({
        action,
        sessionID: request.session.id,
        token: body[csrf.tokenName],
        nonce: body[csrf.nonceName]
      }, done)
    }

    function process (done) {
      processBody(request, body, (error, result) => {
        if (error) return done(error)
        fromProcess = result
        done()
      })
    }
  }
}

function serve404 (request, response) {
  response.statusCode = 404
  const title = 'Not Found'
  response.setHeader('Content-Type', 'text/html')
  response.end(`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    ${header}
    ${nav(request)}
    <main role=main>
      <h2>${title}</h2>
      <p>The page you tried to visit doesn’t exist on this site.</p>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function serve500 (request, response, error) {
  request.log.error(error)
  response.statusCode = 500
  const title = 'Internal Error'
  response.setHeader('Content-Type', 'text/html')
  response.end(html`
<!doctype html>
<html lang=en-US>
  <head>
    ${meta}
    <title>${title}${titleSuffix}</title>
  </head>
  <body>
    <main role=main>
      <h2>${title}</h2>
    </main>
    ${footer}
  </body>
</html>
  `)
}

function serve405 (request, response) {
  response.statusCode = 405
  response.setHeader('Content-Type', 'text/plain')
  response.end('Method Not Allowed')
}

function serve303 (request, response, location) {
  response.statusCode = 303
  response.setHeader('Location', location)
  response.end()
}

function serve302 (request, response, location) {
  response.statusCode = 302
  response.setHeader('Location', location)
  response.end()
}

function authenticate (request, response, handler) {
  const header = request.headers.cookie
  if (!header) {
    createGuestSession()
    return proceed()
  }
  const parsed = cookie.parse(header)
  const sessionID = parsed.proseline
  if (!sessionID) {
    createGuestSession()
    return proceed()
  }
  storage.session.read(sessionID, function (error, session) {
    /* istanbul ignore if */
    if (error) return serve500(request, response, error)
    if (!session) {
      request.session = { id: sessionID }
      return proceed()
    }
    const handle = session.handle
    request.log.info({ sessionID, handle }, 'authenticated')
    request.session = session
    runParallel({
      account: function (done) {
        storage.account.read(handle, done)
      }
    }, function (error, results) {
      /* istanbul ignore if */
      if (error) return serve500(request, response, error)
      const account = results.account
      if (!account) {
        const error = new Error('could not load account')
        return serve500(request, response, error)
      }
      if (account.confirmed) request.account = account
      proceed()
    })
  })

  function proceed () {
    handler(request, response)
  }

  function createGuestSession () {
    const id = uuid.v4()
    const expires = new Date(
      Date.now() + (30 * 24 * 60 * 60 * 1000)
    )
    setCookie(response, id, expires)
    request.session = { id, expires }
  }
}
