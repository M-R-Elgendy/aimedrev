import { Controller, Get, Post, Body, Patch, Param, Delete, Put, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';
@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) { }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto);
  }

  @Get()
  findAll() {
    return this.planService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: ObjectIdDto) {
    return this.planService.findOne(params.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  update(@Param() params: ObjectIdDto, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(params.id, updatePlanDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  remove(@Param() params: ObjectIdDto) {
    return this.planService.remove(params.id);
  }

  @Put(':id/activate')
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  activate(@Param() params: ObjectIdDto) {
    return this.planService.planAcivity(params.id, true);
  }

  @Put(':id/deactivate')
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  deactivate(@Param() params: ObjectIdDto) {
    return this.planService.planAcivity(params.id, false);
  }
}
