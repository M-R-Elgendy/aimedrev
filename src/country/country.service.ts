import { Injectable, HttpException, HttpStatus, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { PrismaClient, Prisma } from '@prisma/client'
import { AxiosService } from 'src/axios/axios.service';
@Injectable()
export class CountryService {

  private readonly prisma: PrismaClient = new PrismaClient();
  private readonly axiosService: AxiosService = new AxiosService();

  async create(createCountryDto: CreateCountryDto) {
    try {
      const isValidData = await this.isValidCountryData(createCountryDto);
      if (!isValidData) throw new BadRequestException("Invalid country data");

      const country = await this.prisma.country.create({
        data: {
          ISOCode: createCountryDto.ISOCode,
          name: createCountryDto.name,
          phoneCode: `+${createCountryDto.phoneCode}`,
        },
      })

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Country created successfully',
        country: country
      };

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('This country already exists.');
        }
      }
      throw error;
    }
  }

  async findAll() {
    try {
      const countries = await this.prisma.country.findMany({
        select: {
          id: true,
          ISOCode: true,
          name: true,
          phoneCode: true,
        }
      });
      return {
        statusCode: HttpStatus.OK,
        message: 'Countries fetched successfully',
        countries: countries
      }
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const country = await this.prisma.country.findUnique({
        where: { id },
        select: {
          id: true,
          ISOCode: true,
          name: true,
          phoneCode: true,
        }
      });

      if (!country) throw new NotFoundException(`Country not found`);

      return {
        statusCode: HttpStatus.OK,
        message: 'Countries fetched successfully',
        country: country
      }
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updateCountryDto: UpdateCountryDto) {
    try {

      const country = await this.prisma.country.findUnique({ where: { id } });
      if (!country) throw new NotFoundException(`Country not found`);

      const isValidData = await this.isValidCountryData(updateCountryDto);
      if (!isValidData) throw new BadRequestException("Invalid country data");

      const updatedCountry = await this.prisma.country.update({
        where: { id },
        data: {
          ISOCode: updateCountryDto.ISOCode,
          name: updateCountryDto.name,
          phoneCode: `+${updateCountryDto.phoneCode}`,
        }
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Country updated successfully',
        country: updatedCountry
      }

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('A country with this ISOCode or phoneCode already exists.');
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const country = await this.prisma.country.findUnique({ where: { id } });

      if (!country) throw new NotFoundException(`Country not found`);
      await this.prisma.country.delete({ where: { id } });

      return {
        statusCode: HttpStatus.OK,
        message: 'Country deleted successfully',
        country: {}
      }

    } catch (error) {
      throw error;
    }
  }

  private async isValidCountryData(createCountryDto: CreateCountryDto): Promise<Boolean> {
    try {
      const response = await this.axiosService.get(process.env.COUNTRIES_API);
      if (response.status !== 200 || response.data.error == true) return true;
      const countries = response.data.data;
      return countries.some((country: { code: string, dial_code: string }) => country.code === createCountryDto.ISOCode && country.dial_code === `+${createCountryDto.phoneCode}`);
    } catch (error) {
      return true;
    }
  }

  private async getCountryFromPhoneCode(phonecode: number): Promise<{ found: boolean, name?: string, code?: string, dial_code?: string }> {

    const response = await this.axiosService.get(process.env.COUNTRIES_API);

    if (response.status !== 200 || response.data.error === true) return { found: false };

    const countries = response.data.data;
    const country = countries.find((country: { dial_code: string }) => country.dial_code === `+${phonecode}`);

    if (!country) return { found: false };

    return {
      found: true,
      name: country.name,
      code: country.code,
      dial_code: country.dial_code,
    };
  }

}