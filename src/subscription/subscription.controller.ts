import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) { }

  @UseGuards(AuthGuard)
  @Post('subscripe/:id') // plan Id
  async create(@Param() params: ObjectIdDto) {
    return this.subscriptionService.create(params.id)
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.ADMIN])
  @Get()
  async findAll() {
    return this.subscriptionService.findAll()
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.ADMIN])
  @Get(':id') // Subscription ID
  async findOne(@Param() params: ObjectIdDto) {
    return this.subscriptionService.findOne(params.id)
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.ADMIN])
  @Delete('/:id') // Subscription ID
  async delete(@Param() params: ObjectIdDto) {
    return this.subscriptionService.delete(params.id)
  }

  @UseGuards(AuthGuard)
  @Get('/verify/:id') // Subscription ID
  async verify(@Param() params: ObjectIdDto) {
    return this.subscriptionService.verify(params.id)
  }


}
