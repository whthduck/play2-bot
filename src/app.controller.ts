import { Controller, Get, SetMetadata } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @Get('live')
  live(): string {
    return '';
  }

  @Get('ready')
  ready(): string {
    return '';
  }
}
