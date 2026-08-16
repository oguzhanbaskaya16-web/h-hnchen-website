import path from 'node:path';

export type PrintAgentMode = 'save';

export type PrintAgentConfig = {
  backendUrl: string;
  token: string;
  agentId: string;
  printerName: string;
  mode: PrintAgentMode;
  pollIntervalMs: number;
  outputDirectory: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} muss gesetzt sein.`);
  }

  return value;
}

function parseBackendUrl(value: string): string {
  const url = new URL(value);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(
      'PRINT_AGENT_BACKEND_URL muss HTTP oder HTTPS verwenden.',
    );
  }

  const isLocal =
    url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  if (url.protocol !== 'https:' && !isLocal) {
    throw new Error(
      'Nicht-lokale Backend-Verbindungen müssen HTTPS verwenden.',
    );
  }

  return url.toString().replace(/\/$/, '');
}

function parsePollInterval(value: string | undefined): number {
  const interval = Number(value ?? '3000');

  if (
    !Number.isInteger(interval) ||
    interval < 1000 ||
    interval > 60000
  ) {
    throw new Error(
      'PRINT_AGENT_POLL_INTERVAL_MS muss zwischen 1000 und 60000 liegen.',
    );
  }

  return interval;
}

function parseMode(value: string | undefined): PrintAgentMode {
  const mode = value?.trim() || 'save';

  if (mode !== 'save') {
    throw new Error(
      'PRINT_AGENT_MODE unterstützt derzeit ausschließlich "save".',
    );
  }

  return mode;
}

export function loadConfig(): PrintAgentConfig {
  const token = required('PRINT_AGENT_TOKEN');

  if (token.length < 32) {
    throw new Error(
      'PRINT_AGENT_TOKEN muss mindestens 32 Zeichen lang sein.',
    );
  }

  return {
    backendUrl: parseBackendUrl(
      required('PRINT_AGENT_BACKEND_URL'),
    ),
    token,
    agentId: required('PRINT_AGENT_ID'),
    printerName: required('PRINT_AGENT_PRINTER_NAME'),
    mode: parseMode(process.env.PRINT_AGENT_MODE),
    pollIntervalMs: parsePollInterval(
      process.env.PRINT_AGENT_POLL_INTERVAL_MS,
    ),
    outputDirectory: path.resolve(
      process.env.PRINT_AGENT_OUTPUT_DIRECTORY?.trim() ||
        './output',
    ),
  };
}