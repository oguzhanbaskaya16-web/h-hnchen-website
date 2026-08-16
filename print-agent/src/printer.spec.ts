import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ClaimedPrintJob } from "./api.js";
import type { PrintAgentConfig } from "./config.js";
import { outputPdf, PrinterError, runExecutable } from "./printer.js";

test("runExecutable akzeptiert einen erfolgreichen Prozess", async () => {
  await runExecutable(process.execPath, ["-e", "process.exit(0)"], 5000);
});

test("runExecutable meldet Exit-Code und Fehlerausgabe", async () => {
  await assert.rejects(
    runExecutable(
      process.execPath,
      ["-e", "process.stderr.write('Testfehler'); process.exit(7)"],
      5000,
    ),
    (error: unknown) => {
      assert.ok(error instanceof PrinterError);
      assert.match(error.message, /Exit-Code 7/);
      assert.match(error.message, /Testfehler/);
      return true;
    },
  );
});

test("runExecutable bricht einen hängenden Prozess ab", async () => {
  await assert.rejects(
    runExecutable(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], 50),
    (error: unknown) => {
      assert.ok(error instanceof PrinterError);
      assert.match(error.message, /nach 50 ms abgebrochen/);
      return true;
    },
  );
});

test("outputPdf speichert im save-Modus eine unveränderte PDF", async () => {
  const outputDirectory = await mkdtemp(
    path.join(os.tmpdir(), "haehnchen-print-agent-"),
  );
  const config: PrintAgentConfig = {
    backendUrl: "http://localhost:3001",
    token: "x".repeat(48),
    agentId: "TEST-AGENT",
    printerName: "TEST-DRUCKER",
    mode: "save",
    pollIntervalMs: 3000,
    outputDirectory,
    printExecutable: null,
    printTimeoutMs: 30000,
    logDirectory: path.join(outputDirectory, "logs"),
    logRetentionDays: 14,
  };
  const job = {
    id: "11111111-1111-4111-8111-111111111111",
    attempt: 1,
    order: { orderNumber: "IDIL-TEST-1234" },
  } as ClaimedPrintJob;
  const pdf = new TextEncoder().encode("%PDF-1.3\nTest\n%%EOF");

  try {
    const outputPath = await outputPdf(config, job, pdf);
    const savedPdf = await readFile(outputPath);
    assert.deepEqual(savedPdf, Buffer.from(pdf));
    assert.match(
      path.basename(outputPath),
      /^bestellung-IDIL-TEST-1234-job-.+-versuch-1\.pdf$/,
    );
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});
