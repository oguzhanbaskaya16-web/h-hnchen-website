import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.mapException(exception);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private mapException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): HttpException {
    switch (exception.code) {
      case 'P2002':
        return new ConflictException(
          'Die angeforderten Daten stehen im Konflikt mit einem bereits vorhandenen Datensatz.',
        );

      case 'P2003':
        return new ConflictException(
          'Der Datensatz kann wegen bestehender Verknüpfungen nicht geändert oder entfernt werden.',
        );

      case 'P2025':
        return new NotFoundException(
          'Der angeforderte Datensatz wurde nicht gefunden.',
        );

      default:
        return new InternalServerErrorException(
          'Beim Verarbeiten der Datenbankanfrage ist ein unerwarteter Fehler aufgetreten.',
        );
    }
  }
}
