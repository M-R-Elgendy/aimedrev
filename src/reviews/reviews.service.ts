import { HttpStatus, Injectable, HttpException, BadRequestException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaClient } from '@prisma/client'

@Injectable()
export class ReviewsService {

  constructor(private readonly prisma: PrismaClient) { }

  async create(createReviewDto: CreateReviewDto) {
    try {
      const review = await this.prisma.review.create({ data: createReviewDto });
      return {
        message: "Review created successfully",
        review: review,
        statusCode: HttpStatus.CREATED
      }
    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    try {
      const review = await this.prisma.review.findMany();
      return {
        message: "Reviews fetched successfully",
        review: review,
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const review = await this.prisma.review.findUnique({ where: { id: id } });

      if (!review) throw new BadRequestException('Review not found')

      return {
        message: "Review fetched successfully",
        review: review,
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updateReviewDto: UpdateReviewDto) {
    try {
      await this.findOne(id);
      const review = await this.prisma.review.update({ where: { id: id }, data: updateReviewDto });

      return {
        message: "Review updated successfully",
        review: review,
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    try {

      await this.findOne(id);
      await this.prisma.review.delete({ where: { id: id } });

      return {
        message: "Review deleted successfully",
        review: {},
        statusCode: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }
}
