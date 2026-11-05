import { Controller, Get, Inject } from '@nestjs/common';
import { ChainService } from './chain/chain.service.js';

@Controller()
export class AppController {
  constructor(@Inject(ChainService) private readonly chain: ChainService) {}

  @Get('health')
  async health() {
    return { ok: true, ...(await this.chain.status()) };
  }
}
