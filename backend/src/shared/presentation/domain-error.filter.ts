import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { NotFoundError, ValidationError } from '../domain/errors';

@Catch(NotFoundError, ValidationError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(exception: NotFoundError | ValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof NotFoundError ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
    response.status(status).json({ statusCode: status, message: exception.message });
  }
}
