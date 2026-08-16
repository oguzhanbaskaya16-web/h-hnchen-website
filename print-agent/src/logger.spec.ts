import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createLogger } from "./logger.js";

test("Logger schreibt Meldungen und löscht nur abgelaufene Agent-Logs", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "haehnchen-agent-logs-"),
  );
  const now = new Date("2026-08-16T12:00:00.000Z");
  const expiredLog = path.join(directory, "print-agent-2026-07-01.log");
  const unrelatedFile = path.join(directory, "behalten.txt");

  try {
    await writeFile(expiredLog, "alt", "utf8");
    await writeFile(unrelatedFile, "behalten", "utf8");
    await utimes(
      expiredLog,
      new Date("2026-07-01T12:00:00.000Z"),
      new Date("2026-07-01T12:00:00.000Z"),
    );

    const logger = await createLogger(directory, 14, now);

    logger.log("Agent wurde gestartet.");
    logger.error("Testfehler wurde protokolliert.");
    await logger.flush();

    await assert.rejects(access(expiredLog));
    await access(unrelatedFile);

    const currentLog = path.join(
      directory,
      `print-agent-${new Date().toISOString().slice(0, 10)}.log`,
    );
    const content = await readFile(currentLog, "utf8");

    assert.match(content, /\[INFO\] Agent wurde gestartet\./);
    assert.match(content, /\[ERROR\] Testfehler wurde protokolliert\./);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
