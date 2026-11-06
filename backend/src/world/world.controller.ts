import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { WorldService } from './world.service.js';

@Controller('world')
export class WorldController {
  constructor(private readonly world: WorldService) {}

  @Post('rp-signature')
  @HttpCode(200)
  rpSignature() {
    return this.world.rpContext();
  }

  @Post('verify')
  @HttpCode(200)
  verify(@Body() body: { proof?: unknown; wallet?: unknown } | undefined) {
    return this.world.verify(body?.proof, body?.wallet);
  }
}
