import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global Exception Filter to ensure consistent, secure JSON API error responses.
 * Never leaks internal server stack traces to clients.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong.';
    let errors: any[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse() as any;

      if (typeof resContent === 'object' && resContent !== null) {
        // If it's our ZodValidationPipe format
        if (resContent.success === false && resContent.errors) {
          return response.status(status).json(resContent);
        }
        // If it's standard NestJS validation error list
        if (Array.isArray(resContent.message)) {
          errors = resContent.message.map((msg: any) => ({
            field: 'validation',
            message: msg,
          }));
        } else {
          message = resContent.message || exception.message;
        }
      } else {
        message = exception.message;
      }
    } else {
      // Internal system error (e.g., db connection lost)
      // Log details internally
      const err = exception as Error;
      this.logger.error(`Internal System Error: ${err?.message}`, err?.stack);
      
      // Override message in production to prevent leakage of db internals
      if (process.env.NODE_ENV === 'production') {
        message = 'An unexpected internal error occurred.';
      } else {
        message = err?.message || 'Something went wrong.';
      }
    }

    const payload: any = {
      success: false,
      message,
    };

    if (errors) {
      payload.errors = errors;
    }

    return response.status(status).json(payload);
  }
}
