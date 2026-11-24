import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import * as soap from 'soap';
import type { Env } from '../config/env.js';
import { BMS_SOAP_CLIENT, BmsClientService } from './bms-client.service.js';
import { BmsExceptionFilter } from './bms-exception.filter.js';
import { BmsRequestValidator } from './bms-request-validator.service.js';
import { BmsController } from './bms.controller.js';

@Module({
  controllers: [BmsController],
  providers: [
    BmsClientService,
    BmsRequestValidator,
    { provide: APP_FILTER, useClass: BmsExceptionFilter },
    {
      provide: BMS_SOAP_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Env, true>) => {
        const wsdl = resolve(process.cwd(), config.get('BMS_WSDL_PATH', { infer: true }));
        const client = await soap.createClientAsync(wsdl, {
          endpoint: config.get('BMS_ENDPOINT', { infer: true }),
        });
        client.setEndpoint(config.get('BMS_ENDPOINT', { infer: true }));
        const extra = config.get('BMS_EXTRA_HEADERS', { infer: true });
        if (extra) {
          for (const [k, v] of Object.entries(JSON.parse(extra) as Record<string, string>)) {
            client.addHttpHeader(k, String(v));
          }
        }
        return client;
      },
    },
  ],
})
export class BmsModule {}
