// Simple logger replacement for standalone mode (replaces @iofinnet/powertools)
export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'INFO', message, ...data }));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'WARN', message, ...data }));
  },
  error: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'ERROR', message, ...data }));
  },
  critical: (message: string, data?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'CRITICAL', message, ...data }));
  },
  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(JSON.stringify({ level: 'DEBUG', message, ...data }));
    }
  },
  addContext: (_key: string, _value: unknown) => {
    // No-op for standalone mode
  },
  appendKeys: (_keys: Record<string, unknown>) => {
    // No-op for standalone mode
  },
};

// Simple tracer stub (no-op for standalone mode)
export const tracer = {
  captureMethod: () => (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
  captureAWSv3Client: <T>(client: T): T => client,
  getSegment: () => null,
  setSegment: () => {},
  annotateColdStart: () => {},
  addServiceNameAnnotation: () => {},
};
