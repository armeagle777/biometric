import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Images travel as base64 inside JSON, so allow ~4/3 of the image cap plus headroom
  // for up to 10 fingerprints per request.
  app.useBodyParser('json', { limit: '70mb' });
  app.use(helmet());
  app.enableCors({
    origin: config.get('CLIENT_ORIGIN', { infer: true }).split(',').map((s) => s.trim()),
  });
  app.setGlobalPrefix('api');

  const port = config.get('PORT', { infer: true });
  // No authentication yet: listen on loopback only. Put a gateway in front before exposing it.
  await app.listen(port, '127.0.0.1');
  new Logger('Bootstrap').log(`BMS gateway listening on http://127.0.0.1:${port}/api`);
}
await bootstrap();
