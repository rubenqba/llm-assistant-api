import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';

@Catch(ZodValidationException, ZodSerializationException)
export class ZodExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ZodExceptionFilter.name);

  catch(exception: ZodValidationException | ZodSerializationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      if (!this.isZodError(zodError)) {
        this.logger.error('Caught ZodValidationException with non-ZodError', zodError);
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        });
      }
      this.logger.warn('Validation failed', z.prettifyError(zodError));

      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        errors: zodError.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();
      if (!this.isZodError(zodError)) {
        this.logger.error('Caught ZodSerializationException with non-ZodError', zodError);
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        });
      }
      this.logger.error('Serialization error', z.prettifyError(zodError));

      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: z.prettifyError(zodError),
      });
    }
  }

  private isZodError(error: any): error is z.ZodError<any> {
    return error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues);
  }
}
