import {
  mkdir,
  open,
} from 'node:fs/promises';
import path from 'node:path';
import type { ClaimedPrintJob } from './api.js';
import type { PrintAgentConfig } from './config.js';

export class PrinterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PrinterError';
  }
}

function safeFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

export async function outputPdf(
  config: PrintAgentConfig,
  job: ClaimedPrintJob,
  pdf: Uint8Array,
): Promise<string> {
  if (config.mode !== 'save') {
    throw new PrinterError(
      `Nicht unterstützter Print-Agent-Modus: ${config.mode}`,
    );
  }

  await mkdir(config.outputDirectory, {
    recursive: true,
  });

  const filename = [
    'bestellung',
    safeFilename(job.order.orderNumber),
    `job-${safeFilename(job.id)}`,
    `versuch-${job.attempt}`,
  ].join('-');

  const outputPath = path.join(
    config.outputDirectory,
    `${filename}.pdf`,
  );

  try {
    const file = await open(outputPath, 'wx');

    try {
      await file.writeFile(pdf);
    } finally {
      await file.close();
    }
  } catch (error) {
    throw new PrinterError(
      `PDF konnte nicht unter ${outputPath} gespeichert werden.`,
      {
        cause: error,
      },
    );
  }

  return outputPath;
}