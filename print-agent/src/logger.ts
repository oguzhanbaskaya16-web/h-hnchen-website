import { appendFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

export type AgentLogger = {
  log(message: string): void;
  error(message: string): void;
  flush(): Promise<void>;
};

const LOG_FILE_PATTERN = /^print-agent-\d{4}-\d{2}-\d{2}\.log$/;

function logFilename(date: Date): string {
  return `print-agent-${date.toISOString().slice(0, 10)}.log`;
}

async function removeExpiredLogs(
  logDirectory: string,
  retentionDays: number,
  now: Date,
): Promise<void> {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await readdir(logDirectory, { withFileTypes: true });

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && LOG_FILE_PATTERN.test(entry.name))
      .map(async (entry) => {
        const filePath = path.join(logDirectory, entry.name);
        const fileStat = await stat(filePath);

        if (fileStat.mtimeMs < cutoff) {
          await rm(filePath, { force: true });
        }
      }),
  );
}

export async function createLogger(
  logDirectory: string,
  retentionDays: number,
  now = new Date(),
): Promise<AgentLogger> {
  await mkdir(logDirectory, { recursive: true });
  await removeExpiredLogs(logDirectory, retentionDays, now);

  let writeQueue = Promise.resolve();

  const write = (level: "INFO" | "ERROR", message: string): void => {
    const timestamp = new Date();
    const line = `[${timestamp.toISOString()}] [${level}] ${message}`;

    if (level === "ERROR") {
      console.error(line);
    } else {
      console.log(line);
    }

    const filePath = path.join(logDirectory, logFilename(timestamp));

    writeQueue = writeQueue
      .then(() => appendFile(filePath, `${line}\n`, "utf8"))
      .catch((error: unknown) => {
        console.error(
          `[${new Date().toISOString()}] [ERROR] Logdatei konnte nicht geschrieben werden:`,
          error,
        );
      });
  };

  return {
    log(message: string): void {
      write("INFO", message);
    },
    error(message: string): void {
      write("ERROR", message);
    },
    async flush(): Promise<void> {
      await writeQueue;
    },
  };
}
