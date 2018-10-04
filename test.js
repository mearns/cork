const cork = require('.')

const logger = cork(entry => console.log(entry), {
  name: 'test-logger',
  decorations: { alwaysThere: 'yes it is' },
  threshold: 'warning',
  middleware: [
    entry => ({
      ...entry,
      level: entry.level + 100
    })
  ]
})

;['trace', 'debug', 'info', 'warn', 'warning', 'error', 'critical', 'XXX'].forEach((level, idx) => {
  logger[level](`This is ${level}`, { level }, { idx })
})

logger.push({ name: 'child-logger' })
logger.error('Child logging')
