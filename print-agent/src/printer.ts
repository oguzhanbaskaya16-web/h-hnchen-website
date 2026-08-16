import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import path from "node:path";
import type { ClaimedPrintJob } from "./api.js";
import type { PrintAgentConfig } from "./config.js";

export class PrinterError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PrinterError";
  }
}

function safeFilename(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export function runExecutable(
  executable: string,
  arguments_: string[],
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let errorOutput = "";

    const child = spawn(executable, arguments_, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
    });

    const finish = (error?: PrinterError): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish(
        new PrinterError(
          `Der Druckvorgang wurde nach ${timeoutMs} ms abgebrochen.`,
        ),
      );
    }, timeoutMs);

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      errorOutput = `${errorOutput}${chunk}`.slice(-2000);
    });

    child.once("error", (error) => {
      finish(
        new PrinterError(
          `Das Druckprogramm konnte nicht gestartet werden: ${executable}`,
          { cause: error },
        ),
      );
    });

    child.once("close", (exitCode, signal) => {
      if (exitCode === 0) {
        finish();
        return;
      }

      const detail = errorOutput.trim();
      const termination =
        exitCode === null
          ? `Signal ${signal ?? "unbekannt"}`
          : `Exit-Code ${exitCode}`;

      finish(
        new PrinterError(
          `Das Druckprogramm meldete ${termination}.` +
            (detail ? ` Ausgabe: ${detail}` : ""),
        ),
      );
    });
  });
}

async function savePdf(
  config: PrintAgentConfig,
  job: ClaimedPrintJob,
  pdf: Uint8Array,
): Promise<string> {
  await mkdir(config.outputDirectory, { recursive: true });

  const filename = [
    "bestellung",
    safeFilename(job.order.orderNumber),
    `job-${safeFilename(job.id)}`,
    `versuch-${job.attempt}`,
  ].join("-");
  const outputPath = path.join(config.outputDirectory, `${filename}.pdf`);

  try {
    const file = await open(outputPath, "wx");
    try {
      await file.writeFile(pdf);
    } finally {
      await file.close();
    }
  } catch (error) {
    throw new PrinterError(
      `PDF konnte nicht unter ${outputPath} gespeichert werden.`,
      { cause: error },
    );
  }

  return outputPath;
}

async function printPdf(
  config: PrintAgentConfig,
  pdfPath: string,
): Promise<void> {
  const executable = config.printExecutable;
  if (!executable) {
    throw new PrinterError(
      "Für den print-Modus ist kein Druckprogramm konfiguriert.",
    );
  }

  await runExecutable(
    executable,
    ["/printTo", config.printerName, pdfPath],
    config.printTimeoutMs,
  );
}

export async function outputPdf(
  config: PrintAgentConfig,
  job: ClaimedPrintJob,
  pdf: Uint8Array,
): Promise<string> {
  const outputPath = await savePdf(config, job, pdf);
  if (config.mode === "print") await printPdf(config, outputPath);
  return outputPath;
}
