import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class PrintAgentAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const configuredToken = process.env.PRINT_AGENT_TOKEN?.trim();

    if (!configuredToken) {
      throw new ServiceUnavailableException(
        'Die Print-Agent-API ist nicht konfiguriert.',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Ein gültiges Print-Agent-Token ist erforderlich.',
      );
    }

    const suppliedToken = authorization.slice('Bearer '.length).trim();

    if (!suppliedToken || !this.tokensMatch(configuredToken, suppliedToken)) {
      throw new UnauthorizedException(
        'Ein gültiges Print-Agent-Token ist erforderlich.',
      );
    }

    return true;
  }

  private tokensMatch(expectedToken: string, suppliedToken: string): boolean {
    const expectedBuffer = Buffer.from(expectedToken);
    const suppliedBuffer = Buffer.from(suppliedToken);

    if (expectedBuffer.length !== suppliedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, suppliedBuffer);
  }
}
