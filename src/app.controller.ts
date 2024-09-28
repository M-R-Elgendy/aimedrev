import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('getSession/:id')
  getSession(@Param('id') id: string) {
    return this.appService.getSession(id);
  }
}
