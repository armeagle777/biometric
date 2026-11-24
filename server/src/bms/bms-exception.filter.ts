import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { MissingThresholdError } from './bms-client.service.js';
import { BmsTransportError } from './bms.errors.js';

/** Maps BMS transport failures to JSON errors; business statuses stay 200. */
@Catch(BmsTransportError, MissingThresholdError)
export class BmsExceptionFilter implements ExceptionFilter {
  catch(exception: BmsTransportError | MissingThresholdError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof MissingThresholdError) {
      res.status(400).json({ statusCode: 400, error: 'Bad Request', message: exception.message });
      return;
    }
    const statusCode = exception.kind === 'timeout' ? 504 : 502;
    res.status(statusCode).json({
      statusCode,
      error: statusCode === 504 ? 'Gateway Timeout' : 'Bad Gateway',
      kind: exception.kind,
      operation: exception.operation,
      message: exception.message,
    });
  }
}
