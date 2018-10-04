const cork = require('.')

const logger = cork(entry => console.log(entry))

;['trace', 'debug', 'info', 'warn', 'warning', 'error', 'critical', 'XXX'].forEach((level, idx) => {
  logger[level](`This is ${level}`, { level }, { idx })
})
