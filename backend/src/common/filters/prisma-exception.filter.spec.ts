import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();

    json = jest.fn();
    status = jest.fn().mockReturnValue({
      json,
    });

    host = {
      switchToHttp: () => ({
        getResponse: () => ({
          status,
        }),
        getRequest: jest.fn(),
        getNext: jest.fn(),
      }),
    } as unknown as ArgumentsHost;
  });

  function createKnownPrismaError(
    code: string,
  ): Prisma.PrismaClientKnownRequestError {
    return new Prisma.PrismaClientKnownRequestError('Test-Prisma-Fehler', {
      code,
      clientVersion: '7.9.1',
    });
  }

  it('übersetzt P2002 in 409 Conflict', () => {
    filter.catch(createKnownPrismaError('P2002'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message:
        'Die angeforderten Daten stehen im Konflikt mit einem bereits vorhandenen Datensatz.',
      error: 'Conflict',
    });
  });

  it('übersetzt P2003 in 409 Conflict', () => {
    filter.catch(createKnownPrismaError('P2003'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      statusCode: 409,
      message:
        'Der Datensatz kann wegen bestehender Verknüpfungen nicht geändert oder entfernt werden.',
      error: 'Conflict',
    });
  });

  it('übersetzt P2025 in 404 Not Found', () => {
    filter.catch(createKnownPrismaError('P2025'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Der angeforderte Datensatz wurde nicht gefunden.',
      error: 'Not Found',
    });
  });

  it('übersetzt andere bekannte Prisma-Fehler in 500', () => {
    filter.catch(createKnownPrismaError('P2999'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message:
        'Beim Verarbeiten der Datenbankanfrage ist ein unerwarteter Fehler aufgetreten.',
      error: 'Internal Server Error',
    });
  });
});
