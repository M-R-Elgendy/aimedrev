import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';
@Controller('country')
@UseGuards(AuthGuard, RoleGuard)
export class CountryController {
  constructor(private readonly countryService: CountryService) { }

  @Post()
  @Roles([Role.ADMIN])
  create(@Body() createCountryDto: CreateCountryDto) {
    return this.countryService.create(createCountryDto);
  }

  @Get()
  findAll() {
    return this.countryService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: ObjectIdDto) {
    return this.countryService.findOne(params.id);
  }

  @Patch(':id')
  @Roles([Role.ADMIN])
  update(@Param() params: ObjectIdDto, @Body() updateCountryDto: UpdateCountryDto) {
    return this.countryService.update(params.id, updateCountryDto);
  }

  @Delete(':id')
  @Roles([Role.ADMIN])
  remove(@Param() params: ObjectIdDto) {
    return this.countryService.remove(params.id);
  }
}
