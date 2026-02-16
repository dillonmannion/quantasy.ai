type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogData {
  [key: string]: unknown
}

const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development'

function formatMessage(level: LogLevel, module: string, message: string, data?: LogData): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${module}]`
  
  if (data && Object.keys(data).length > 0) {
    return `${timestamp} ${level.toUpperCase()} ${prefix} ${message} ${JSON.stringify(data)}`
  }
  
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${message}`
}

export const logger = {
  debug(module: string, message: string, data?: LogData): void {
    if (DEBUG) {
      console.log(formatMessage('debug', module, message, data))
    }
  },

  info(module: string, message: string, data?: LogData): void {
    console.log(formatMessage('info', module, message, data))
  },

  warn(module: string, message: string, data?: LogData): void {
    console.warn(formatMessage('warn', module, message, data))
  },

  error(module: string, message: string, data?: LogData): void {
    console.error(formatMessage('error', module, message, data))
  },
}
