import path from "node:path";

export type PrintAgentMode = "save" | "print";

export type PrintAgentConfig = {
  backendUrl: string;
  token: string;
  agentId: string;
  printerName: string;
  mode: PrintAgentMode;
  pollIntervalMs: number;
  outputDirectory: string;
  printExecutable: string | null;
  printTimeoutMs: number;
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

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("PRINT_AGENT_BACKEND_URL muss HTTP oder HTTPS verwenden.");
  }

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (url.protocol !== "https:" && !isLocal) {
    throw new Error(
      "Nicht-lokale Backend-Verbindungen müssen HTTPS verwenden.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

function parseInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value ?? String(defaultValue));

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} muss zwischen ${minimum} und ${maximum} liegen.`);
  }

  return parsed;
}

function parseMode(value: string | undefined): PrintAgentMode {
  const mode = value?.trim() || "save";

  if (mode !== "save" && mode !== "print") {
    throw new Error(
      'PRINT_AGENT_MODE unterstützt ausschließlich "save" oder "print".',
    );
  }

  return mode;
}

export function loadConfig(): PrintAgentConfig {
  const token = required("PRINT_AGENT_TOKEN");
  const mode = parseMode(process.env.PRINT_AGENT_MODE);
  const configuredExecutable = process.env.PRINT_AGENT_PRINT_EXECUTABLE?.trim();

  if (token.length < 32) {
    throw new Error("PRINT_AGENT_TOKEN muss mindestens 32 Zeichen lang sein.");
  }

  if (mode === "print" && !configuredExecutable) {
    throw new Error(
      "PRINT_AGENT_PRINT_EXECUTABLE muss im print-Modus gesetzt sein.",
    );
  }

  return {
    backendUrl: parseBackendUrl(required("PRINT_AGENT_BACKEND_URL")),
    token,
    agentId: required("PRINT_AGENT_ID"),
    printerName: required("PRINT_AGENT_PRINTER_NAME"),
    mode,
    pollIntervalMs: parseInteger(
      "PRINT_AGENT_POLL_INTERVAL_MS",
      process.env.PRINT_AGENT_POLL_INTERVAL_MS,
      3000,
      1000,
      60000,
    ),
    outputDirectory: path.resolve(
      process.env.PRINT_AGENT_OUTPUT_DIRECTORY?.trim() || "./output",
    ),
    printExecutable: configuredExecutable
      ? path.resolve(configuredExecutable)
      : null,
    printTimeoutMs: parseInteger(
      "PRINT_AGENT_PRINT_TIMEOUT_MS",
      process.env.PRINT_AGENT_PRINT_TIMEOUT_MS,
      30000,
      5000,
      120000,
    ),
  };
}
