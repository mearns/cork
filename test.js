const cork = require('.')

const logger = cork(entry => console.log(entry), {
  name: 'test-logger',
  decorations: { alwaysThere: 'yes it is' }
})

logger.addLevel('request', 'info')
  .addLevel('response', 405)
  .addLevel('urgent', -1)

// ;['trace', 'debug', 'info', 'warn', 'warning', 'error', 'critical', 'XXX', 'request', 'info', 'urgent'].forEach((level, idx) => {
//   logger[level](`This is ${level}`, { level }, { idx })
// })

// logger.push({ name: 'child-logger' })
// logger.error('Child logging')
