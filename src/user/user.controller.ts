import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@UseGuards(AuthGuard, RoleGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @Roles([Role.ADMIN])
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Roles([Role.ADMIN])
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @Roles(['*'])
  findOne(@Param() params: ObjectIdDto) {
    return this.userService.findOne(params.id);
  }

  @Patch()
  @Roles([Role.USER])
  update(@Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(updateUserDto);
  }

  @Delete(':id')
  @Roles([Role.ADMIN])
  remove(@Param() params: ObjectIdDto) {
    return this.userService.remove(params.id);
  }

  @Patch(':id/suspend')
  @Roles([Role.ADMIN])
  suspend(@Param() params: ObjectIdDto) {
    return this.userService.accountStatus(params.id, true);
  }

  @Patch(':id/unsuspend')
  @Roles([Role.ADMIN])
  unsuspend(@Param() params: ObjectIdDto) {
    return this.userService.accountStatus(params.id, false);
  }
}
