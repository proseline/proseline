import webdriverio from 'webdriverio'

// See: https://webdriver.io/docs/runprogrammatically.html
export default () => {
  return webdriverio.remote({
    logLevel: 'error',
    path: '/',
    capabilities: { browserName: 'firefox' }
  })
}
