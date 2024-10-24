import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

import { ObjectIdDto } from 'src/global/DTOs/object-id.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@UseGuards(AuthGuard, RoleGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post()
  @Roles([Role.ADMIN, Role.PAID_USER])
  create(@Body() createChatDto: CreateChatDto) {
    return this.chatService.create(createChatDto);
  }

  @Get()
  @Roles([Role.ADMIN, Role.PAID_USER])
  findAll(@Query() createChatDto: CreateChatDto) {
    return this.chatService.findAll(createChatDto.type);
  }

  @Get(':id')
  @Roles([Role.ADMIN, Role.PAID_USER])
  findOne(@Param() params: ObjectIdDto) {
    return this.chatService.findOne(params.id);
  }

  @Patch(':id')
  @Roles([Role.ADMIN, Role.PAID_USER])
  update(@Param() params: ObjectIdDto, @Body() updateChatDto: UpdateChatDto) {
    return this.chatService.update(params.id, updateChatDto);
  }

  @Delete(':id')
  @Roles([Role.ADMIN, Role.PAID_USER])
  remove(@Param() params: ObjectIdDto,) {
    return this.chatService.remove(params.id);
  }
}
