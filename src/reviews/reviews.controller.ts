import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.ADMIN])
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @Get()
  findAll() {
    return this.reviewsService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  findOne(@Param() params: ObjectIdDto) {
    return this.reviewsService.findOne(params.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  update(@Param() params: ObjectIdDto, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.update(params.id, updateReviewDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  // @Roles([Role.ADMIN])
  remove(@Param() params: ObjectIdDto) {
    return this.reviewsService.remove(params.id);
  }
}
