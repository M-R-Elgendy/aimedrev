import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RefundService } from './refund.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
@Controller('refund')
@UseGuards(AuthGuard, RoleGuard)
export class RefundController {

  constructor(private readonly refundService: RefundService) { }

  @Get()
  @Roles([Role.ADMIN])
  findAll() {
    return this.refundService.findAll();
  }

  @Get(':id')
  @Roles([Role.ADMIN])
  findOne(@Param() params: ObjectIdDto) {
    return this.refundService.findOne(params.id);
  }

}
