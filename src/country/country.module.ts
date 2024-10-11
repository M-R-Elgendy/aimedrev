import { Module } from '@nestjs/common';
import { CountryService } from './country.service';
import { CountryController } from './country.controller';
import { AxiosService } from 'src/axios/axios.service';
import { PrismaClient } from '@prisma/client';
@Module({
  controllers: [CountryController],
  providers: [CountryService, AxiosService, PrismaClient],
})
export class CountryModule { }
