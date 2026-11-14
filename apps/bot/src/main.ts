import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
}

void bootstrap().catch(() => {
  Logger.error('Bot bootstrap failed.', 'Bootstrap');
  process.exitCode = 1;
});
