import { Injectable, Logger } from '@nestjs/common';
import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { Bot } from 'grammy';

@Injectable()
export class BotService
  implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(BotService.name);
  private readonly bot: Bot;
  private polling: Promise<void> | undefined;

  constructor() {
    const token = process.env.BOT_TOKEN?.trim();
    if (!token) {
      throw new Error('BOT_TOKEN is required.');
    }

    this.bot = new Bot(token);
    this.bot.command('start', (ctx) => ctx.reply('ДИМОН'));
    this.bot.catch(({ ctx }) => {
      this.logger.error(`Failed to handle Telegram update ${ctx.update.update_id}.`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.bot.init();
  }

  onApplicationBootstrap(): void {
    // Polling is a long-lived promise; it must not block Nest bootstrap.
    this.polling = this.bot.start({
      onStart: () => this.logger.log('Telegram polling started.'),
    }).catch(() => {
      this.logger.error('Telegram polling failed; shutting down.');
      process.exitCode = 1;
      process.kill(process.pid, 'SIGTERM');
    });
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.bot.isRunning()) {
      await this.bot.stop();
    }
    await this.polling;
  }
}
