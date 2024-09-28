import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';


@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) { }

  @Get('/webhook/verify/:id') // Subscription ID
  async verify(@Param() params: ObjectIdDto) {
    return this.subscriptionService.verify(params.id)
  }
}
