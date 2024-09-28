import { Controller, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) { }

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.ADMIN])
  findAll() {
    return this.transactionService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.ADMIN])
  async findOne(@Param() params: ObjectIdDto) {
    return this.transactionService.findOne(params.id);
  }
}
