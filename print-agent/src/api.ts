import type { PrintAgentConfig } from './config.js';

export type ClaimedPrintJob = {
  id: string;
  claimToken: string;
  attempt: number;
  maxAttempts: number;
  claimedAt: string;
  leaseExpiresAt: string;
  agentId: string;
  printerName: string;
  pdfPath: string;
  order: {
    orderNumber: string;
    orderType: string;
    orderedAt: string;
    requestedTime: string;
    customer: {
      firstName: string;
      lastName: string;
      phone: string;
    } | null;
    note: string | null;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: string;
      options: Array<{
        name: string;
        surcharge: string;
      }>;
    }>;
    subtotal: string;
    totalAmount: string;
    payment: {
      method: string;
      status: string;
    } | null;
  };
};

type ClaimResponse = {
  job: ClaimedPrintJob | null;
};

export type PrintErrorType =
  | 'NETWORK'
  | 'PRINTER'
  | 'PERMANENT';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class PrintAgentApi {
  constructor(private readonly config: PrintAgentConfig) {}

  claim(): Promise<ClaimResponse> {
    return this.requestJson<ClaimResponse>(
      '/api/v1/print-jobs/claim',
      {
        method: 'POST',
        body: JSON.stringify({
          agentId: this.config.agentId,
          printerName: this.config.printerName,
        }),
      },
    );
  }

  async downloadPdf(pdfPath: string): Promise<Uint8Array> {
    const response = await this.request(pdfPath, {
      method: 'GET',
    });

    const contentType =
      response.headers.get('content-type')?.toLowerCase() ?? '';

    if (!contentType.includes('application/pdf')) {
      throw new ApiError(
        `Unerwarteter PDF-Inhaltstyp: ${contentType || 'unbekannt'}`,
        response.status,
      );
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const signature = new TextDecoder().decode(bytes.slice(0, 5));

    if (signature !== '%PDF-') {
      throw new ApiError(
        'Die heruntergeladene Datei ist kein gültiges PDF.',
        response.status,
      );
    }

    return bytes;
  }

  markPrinted(job: ClaimedPrintJob): Promise<unknown> {
    return this.requestJson(
      `/api/v1/print-jobs/${encodeURIComponent(job.id)}/printed`,
      {
        method: 'POST',
        body: JSON.stringify({
          claimToken: job.claimToken,
          agentId: this.config.agentId,
          printerName: this.config.printerName,
        }),
      },
    );
  }

  markFailed(
    job: ClaimedPrintJob,
    errorType: PrintErrorType,
    error: string,
  ): Promise<unknown> {
    return this.requestJson(
      `/api/v1/print-jobs/${encodeURIComponent(job.id)}/failed`,
      {
        method: 'POST',
        body: JSON.stringify({
          claimToken: job.claimToken,
          agentId: this.config.agentId,
          printerName: this.config.printerName,
          errorType,
          error: error.slice(0, 4000),
        }),
      },
    );
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await this.request(path, init);

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(
        'Das Backend lieferte keine gültige JSON-Antwort.',
        response.status,
      );
    }
  }

  private async request(
    requestPath: string,
    init: RequestInit,
  ): Promise<Response> {
    const url = new URL(
      requestPath,
      `${this.config.backendUrl}/`,
    );

    let response: Response;

    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: 'application/json, application/pdf',
          ...(init.body
            ? { 'Content-Type': 'application/json' }
            : {}),
          ...init.headers,
        },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      throw new ApiError(
        error instanceof Error
          ? `Backend nicht erreichbar: ${error.message}`
          : 'Backend nicht erreichbar.',
        null,
      );
    }

    if (!response.ok) {
      const responseText = await response.text();

      throw new ApiError(
        `Backend antwortete mit ${response.status}: ${responseText.slice(
          0,
          1000,
        )}`,
        response.status,
      );
    }

    return response;
  }
}