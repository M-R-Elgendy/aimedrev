import { Controller, Get, Post, Body, Patch, Param, Delete, Put } from '@nestjs/common';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) { }

  @Post()
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
  update(@Param() params: ObjectIdDto, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.update(params.id, updatePlanDto);
  }

  @Delete(':id')
  remove(@Param() params: ObjectIdDto) {
    return this.planService.remove(params.id);
  }

  @Put(':id/activate')
  activate(@Param() params: ObjectIdDto) {
    return this.planService.planAcivity(params.id, true);
  }

  @Put(':id/deactivate')
  deactivate(@Param() params: ObjectIdDto) {
    return this.planService.planAcivity(params.id, false);
  }
}
