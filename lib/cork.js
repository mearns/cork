
const DEFAULT_LEVELS = [
  [0, 'XXX'],
  [99, 'critical'],
  [199, 'error'],
  [299, 'warn'],
  [299, 'warning'],
  [399, 'info'],
  [499, 'debug'],
  [599, 'trace']
]
const DEFAULT_LOG_LEVEL = 399

function logLevelsToLookup (levels) {
  return levels.reduce((map, [numeric, tag]) => {
    map[tag] = numeric
    return map
  }, {})
}

class LoggingImplementation {
  constructor (logLevels, logLevelLookup, entryWriter, _options) {
    this._logLevels = logLevels
    this._logLevelLookup = logLevelLookup || logLevelsToLookup(logLevels)
    this._entryWriter = entryWriter

    const options = this._verifyOptions(_options)
    this._options = options
    this._name = options.name
    this._threshold = options.threshold
    this._decorations = options.decorations
    this._middleware = options.middleware
  }

  spawn ({ name, threshold, decorations, middleware }) {
    return new LoggingImplementation(
      this._logLevels,
      this._logLevelLookup,
      this._entryWriter,
      {
        ...this._options,
        name,
        threshold,
        decorations: { ...this._decorations, ...decorations },
        middleware: [...this.middleware, ...middleware]
      }
    )
  }

  _verifyOptions ({ name = null, threshold, decorations = {}, middleware = [] }) {
    return {
      name,
      threshold: this._resolveLogLevel(threshold),
      decorations: this._coerceMeta(decorations),
      middleware
    }
  }

  _findTag (level) {
    for (let i = 0; i < this._logLevels.length; i++) {
      const [currentLevel, tag] = this._logLevels[i]
      if (level <= currentLevel) {
        return tag.toUpperCase()
      }
    }
    return 'UNKNOWN'
  }

  _resolveLogLevel (level) {
    if (typeof level === 'number') {
      return level
    } else if (typeof level === 'string') {
      const number = this._logLevelLookup[level]
      if (number) {
        return number
      }
    }
    throw new TypeError(`Unknown log level: ${level}`)
  }

  _resolveMeta (metas) {
    return metas.reduce((acc, m) => ({ ...acc, ...this._coerceMeta(m) }), {})
  }

  _coerceMeta (meta) {
    return meta
  }

  log (level, message, meta) {
    const entry = this._middleware.reduce((entry, middleware) => middleware(entry), {
      name: this._name, level, message, meta: [this._decorations, ...meta]
    })
    if (entry.level <= this._threshold) {
      const { name, level, message, meta } = entry
      const tag = this._findTag(level)
      this._entryWriter({ name, tag, level, message, meta: this._resolveMeta(meta) })
    }
  }
}

class LoggingFacade {
  constructor (entryWriter, {
    logLevels = DEFAULT_LEVELS,
    name,
    threshold = DEFAULT_LOG_LEVEL,
    decorations = {},
    middleware = []
  } = {}) {
    logLevels.forEach(([level, tag]) => {
      this[tag] = (message, ...meta) => {
        return this.log(level, message, ...meta)
      }
    })
    this._stack = [new LoggingImplementation(logLevels, null, entryWriter, { name, threshold, decorations, middleware })]
  }

  push (options) {
    const current = this._stack[this._stack.length - 1]
    this._stack.push(current.spawn(options))
    return this
  }

  pop () {
    this._stack.pop()
    return this
  }

  log (level, message, ...meta) {
    const impl = this._stack[this._stack.length - 1]
    impl.log(level, message, meta)
    return this
  }
}

function createLogger (entryWriter, options = {}) {
  return new LoggingFacade(entryWriter, options)
}

module.exports = createLogger
