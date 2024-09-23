import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';

@Controller('country')
export class CountryController {
  constructor(private readonly countryService: CountryService) { }

  @Post()
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
  update(@Param() params: ObjectIdDto, @Body() updateCountryDto: UpdateCountryDto) {
    return this.countryService.update(params.id, updateCountryDto);
  }

  @Delete(':id')
  remove(@Param() params: ObjectIdDto) {
    return this.countryService.remove(params.id);
  }
}
