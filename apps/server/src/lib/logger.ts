import type { Request, Response, NextFunction } from 'express';

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  white: '\x1b[97m',
};

function getTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
}

export const logger = {
  info(tag: string, message: string, data?: unknown) {
    const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    const level = `${colors.blue}${colors.bold}[INFO]${colors.reset}`;
    const category = `${colors.cyan}[${tag}]${colors.reset}`;
    const extra = data !== undefined ? `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}` : '';
    console.log(`${time} ${level} ${category} ${message}${extra}`);
  },

  success(tag: string, message: string, data?: unknown) {
    const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    const level = `${colors.green}${colors.bold}[SUCCESS]${colors.reset}`;
    const category = `${colors.cyan}[${tag}]${colors.reset}`;
    const extra = data !== undefined ? `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}` : '';
    console.log(`${time} ${level} ${category} ${colors.green}${message}${colors.reset}${extra}`);
  },

  warn(tag: string, message: string, data?: unknown) {
    const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    const level = `${colors.yellow}${colors.bold}[WARN]${colors.reset}`;
    const category = `${colors.cyan}[${tag}]${colors.reset}`;
    const extra = data !== undefined ? `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}` : '';
    console.warn(`${time} ${level} ${category} ${colors.yellow}${message}${colors.reset}${extra}`);
  },

  error(tag: string, message: string, err?: unknown) {
    const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    const level = `${colors.red}${colors.bold}[ERROR]${colors.reset}`;
    const category = `${colors.cyan}[${tag}]${colors.reset}`;
    const errText =
      err instanceof Error
        ? `\n${colors.red}${err.stack || err.message}${colors.reset}`
        : err !== undefined
        ? `\n${colors.red}${JSON.stringify(err, null, 2)}${colors.reset}`
        : '';
    console.error(`${time} ${level} ${category} ${colors.red}${colors.bold}${message}${colors.reset}${errText}`);
  },

  debug(tag: string, message: string, data?: unknown) {
    const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    const level = `${colors.magenta}${colors.bold}[DEBUG]${colors.reset}`;
    const category = `${colors.cyan}[${tag}]${colors.reset}`;
    const extra = data !== undefined ? `\n${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}` : '';
    console.log(`${time} ${level} ${category} ${message}${extra}`);
  },
};

/**
 * Express middleware to format and log every incoming HTTP request and response
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Mask sensitive fields in logs
  const sanitize = (body: any) => {
    if (!body || typeof body !== 'object') return body;
    const copy = { ...body };
    if ('pin' in copy) copy.pin = '******';
    if ('password' in copy) copy.password = '******';
    if ('textlkApiToken' in copy) copy.textlkApiToken = copy.textlkApiToken ? '***TOKEN***' : copy.textlkApiToken;
    return copy;
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Status color
    let statusColor = colors.green;
    if (status >= 500) statusColor = colors.red;
    else if (status >= 400) statusColor = colors.yellow;
    else if (status >= 300) statusColor = colors.cyan;

    // Method color
    let methodColor = colors.blue;
    if (method === 'POST') methodColor = colors.green;
    else if (method === 'PATCH' || method === 'PUT') methodColor = colors.yellow;
    else if (method === 'DELETE') methodColor = colors.red;

    const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    const level = `${status >= 400 ? colors.yellow : colors.blue}${colors.bold}[HTTP]${colors.reset}`;
    const methodStr = `${methodColor}${colors.bold}${method.padEnd(6)}${colors.reset}`;
    const statusStr = `${statusColor}${colors.bold}${status}${colors.reset}`;
    const durationStr = `${colors.gray}(${duration}ms)${colors.reset}`;

    // Include query or sanitized payload info if present
    const payloadInfo =
      method !== 'GET' && req.body && Object.keys(req.body).length > 0
        ? ` ${colors.dim}payload: ${JSON.stringify(sanitize(req.body))}${colors.reset}`
        : '';

    console.log(`${time} ${level} ${methodStr} ${originalUrl} ${statusStr} ${durationStr}${payloadInfo}`);
  });

  next();
}
