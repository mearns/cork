
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
  constructor (entryWriter, _options) {
    this._entryWriter = entryWriter

    const options = this._verifyOptions(_options)
    this._options = options
    this._name = options.name
    this._threshold = options.threshold
    this._decorations = options.decorations
    this._middleware = options.middleware
    this._logLevels = options.logLevels
    this._logLevelLookup = logLevelsToLookup(this._logLevels)
  }

  spawn ({ name = this._name, threshold = this._threshold, logLevels = this._logLevels, decorations = {}, middleware = [] }) {
    return new LoggingImplementation(
      this._entryWriter,
      {
        name,
        threshold,
        logLevels,
        decorations: { ...this._decorations, ...decorations },
        middleware: [...this._middleware, ...middleware]
      }
    )
  }

  _verifyOptions ({ name = null, threshold = DEFAULT_LOG_LEVEL, logLevels = DEFAULT_LEVELS, decorations = {}, middleware = [] }) {
    return {
      name,
      threshold: this._resolveLogLevel(threshold),
      logLevels,
      decorations: this._coerceMeta(decorations),
      middleware
    }
  }

  _resolveMeta (metas) {
    return metas.reduce((acc, m) => ({ ...acc, ...this._coerceMeta(m) }), {})
  }

  _coerceMeta (meta) {
    return meta
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
    // XXX: Add helper methods addApi() and removeApi() to use here, and in push/pop.
    logLevels.forEach(([level, tag]) => {
      this[tag] = (message, ...meta) => {
        return this.log(level, message, ...meta)
      }
    })
    this._stack = [new LoggingImplementation(entryWriter, { name, threshold, logLevels, decorations, middleware })]
  }

  addLevel (tag, _level) {
    const level = this._resolveLogLevel(_level)
    this[tag] = (message, ...meta) => {
      return this.log(level, message, ...meta)
    }
    let i
    for (i = 0; i < this._logLevels.length; i++) {
      if (level < this._logLevels[i][0]) {
        this._logLevels = [...this._logLevels]
        this._logLevels.splice(i, 0, [level, tag])
        break
      }
    }
    if (i === this._logLevelLookup.length) {
      this._logLevels.unshift([level, tag])
    }
    this._logLevelLookup = logLevelsToLookup(this._logLevels)
    return this
  }

  push (options) {
    const current = this._stack[this._stack.length - 1]
    current.getLogLevels().forEach(([level, tag]) => {
      delete this[tag]
    })

    const next = current.spawn(options)
    this._stack.push(next)
    next.getLogLevels().forEach(([level, tag]) => {

    })
    return this
  }

  pop () {
    this._stack.pop()
    return this
  }

  log (level, message, ...meta) {
    const impl = this._stack[this._stack.length - 1]
    impl.log(this._resolveLogLevel(level), message, meta)
    return this
  }
}

function createLogger (entryWriter, options = {}) {
  return new LoggingFacade(entryWriter, options)
}

module.exports = createLogger
