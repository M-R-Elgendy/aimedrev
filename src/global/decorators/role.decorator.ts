import { Reflector } from '@nestjs/core';
import { Role } from '../types';

export const Roles = Reflector.createDecorator<Array<Role | '*'>>();