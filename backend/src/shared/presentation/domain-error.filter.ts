import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../domain/errors';

@Catch(NotFoundError, ValidationError, ConflictError, UnauthorizedError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: NotFoundError | ValidationError | ConflictError | UnauthorizedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = this.statusFor(exception);
    response.status(status).json({ statusCode: status, message: exception.message });
  }

  private statusFor(exception: NotFoundError | ValidationError | ConflictError | UnauthorizedError): HttpStatus {
    if (exception instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (exception instanceof ConflictError) return HttpStatus.CONFLICT;
    if (exception instanceof UnauthorizedError) return HttpStatus.UNAUTHORIZED;
    return HttpStatus.BAD_REQUEST; // ValidationError
  }
}
