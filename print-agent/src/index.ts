import {
  ApiError,
  PrintAgentApi,
  type ClaimedPrintJob,
  type PrintErrorType,
} from "./api.js";
import { loadConfig } from "./config.js";
import { outputPdf, PrinterError } from "./printer.js";

const config = loadConfig();
const api = new PrintAgentApi(config);

let shuttingDown = false;

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function classifyError(error: unknown): PrintErrorType {
  if (error instanceof PrinterError) {
    return "PRINTER";
  }

  if (
    error instanceof ApiError &&
    error.status !== null &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return "PERMANENT";
  }

  return "NETWORK";
}

async function reportFailure(
  job: ClaimedPrintJob,
  error: unknown,
): Promise<void> {
  const message = errorMessage(error);
  const errorType = classifyError(error);

  try {
    await api.markFailed(job, errorType, message);
    log(
      `PrintJob ${job.id} wurde als ${errorType}-Fehler gemeldet: ${message}`,
    );
  } catch (reportError) {
    log(
      `Fehlerstatus für PrintJob ${job.id} konnte nicht gemeldet werden: ${errorMessage(
        reportError,
      )}`,
    );
  }
}

async function processNextJob(): Promise<void> {
  const response = await api.claim();
  const job = response.job;

  if (!job) {
    return;
  }

  log(
    `PrintJob ${job.id} für Bestellung ${job.order.orderNumber} reserviert ` +
      `(Versuch ${job.attempt}/${job.maxAttempts}).`,
  );

  let outputCompleted = false;

  try {
    const pdf = await api.downloadPdf(job);
    const outputPath = await outputPdf(config, job, pdf);

    outputCompleted = true;

    log(`PrintJob ${job.id} wurde gespeichert: ${outputPath}`);

    await api.markPrinted(job);

    log(`PrintJob ${job.id} wurde erfolgreich bestätigt.`);
  } catch (error) {
    if (outputCompleted) {
      log(
        `UNSICHERER STATUS für PrintJob ${job.id}: Die PDF-Ausgabe war erfolgreich, ` +
          `aber die Bestätigung ist fehlgeschlagen. Der Job wird nicht als Fehler gemeldet. ` +
          `Nach Ablauf der Lease kann ein gekennzeichneter Wiederholungsdruck entstehen. ` +
          `Ursache: ${errorMessage(error)}`,
      );

      return;
    }

    await reportFailure(job, error);
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function run(): Promise<void> {
  log(`Print-Agent ${config.agentId} startet.`);
  log(`Backend: ${config.backendUrl}`);
  log(`Drucker/Modus: ${config.printerName} / ${config.mode}`);
  log(`Polling-Intervall: ${config.pollIntervalMs} ms`);

  while (!shuttingDown) {
    try {
      await processNextJob();
    } catch (error) {
      log(`Polling-Fehler: ${errorMessage(error)}`);
    }

    if (!shuttingDown) {
      await sleep(config.pollIntervalMs);
    }
  }

  log("Print-Agent wurde beendet.");
}

function requestShutdown(signal: string): void {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log(`${signal} empfangen. Print-Agent wird beendet.`);
}

process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

void run().catch((error: unknown) => {
  console.error(
    `[${new Date().toISOString()}] Print-Agent konnte nicht starten:`,
    error,
  );
  process.exitCode = 1;
});
