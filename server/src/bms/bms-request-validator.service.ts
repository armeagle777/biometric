import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { z } from 'zod';
import type { Env } from '../config/env.js';
import { buildSchemas, type BmsSchemas } from './bms.schemas.js';

@Injectable()
export class BmsRequestValidator {
  private readonly schemas: BmsSchemas;

  constructor(config: ConfigService<Env, true>) {
    this.schemas = buildSchemas({
      maxImageBytes: config.get('BMS_MAX_IMAGE_BYTES', { infer: true }),
      defaultResultLimit: config.get('BMS_DEFAULT_RESULT_LIMIT', { infer: true }),
    });
  }

  parse<K extends keyof BmsSchemas>(key: K, body: unknown): z.infer<BmsSchemas[K]> {
    const result = this.schemas[key].safeParse(body);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    return result.data as z.infer<BmsSchemas[K]>;
  }
}
