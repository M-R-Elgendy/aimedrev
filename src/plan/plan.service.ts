import { HttpStatus, Injectable, HttpException } from '@nestjs/common';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PlanService {

  private readonly prisma: PrismaClient = new PrismaClient();

  async create(createPlanDto: CreatePlanDto) {
    try {
      const plan = await this.prisma.plan.create({ data: createPlanDto });
      return {
        message: "Plan created successfully",
        plan: plan,
        status: HttpStatus.CREATED
      }
    } catch (error) {
      throw error;
    }
  }

  async findAll() {
    const plans = await this.prisma.plan.findMany({
      where: {
        isActive: true,
        isDeleted: false
      }
    });

    plans.map((plan) => delete plan.isDeleted);

    return {
      message: "Plans fetched successfully",
      plans: plans,
      status: HttpStatus.OK
    }
  }

  async findOne(id: string) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      return {
        message: "Plan fetched successfully",
        plan: plan,
        status: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updatePlanDto: UpdatePlanDto) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      const updatedPlan = await this.prisma.plan.update({ where: { id: id }, data: updatePlanDto });
      return {
        message: "Plan updated successfully",
        plan: updatedPlan,
        status: HttpStatus.OK
      }
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

      await this.prisma.plan.update({ where: { id: id }, data: { isDeleted: true } });

      return {
        message: "Plan deleted successfully",
        plan: {},
        status: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async planAcivity(id: string, isActive: boolean) {
    try {
      const plan = await this.prisma.plan.findFirst({
        where: { id: id, isDeleted: false },
      });

      if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (plan.isActive == isActive) throw new HttpException({ message: 'Plan already ' + (isActive ? 'active' : 'inactive'), status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);

      const updatedPlan = await this.prisma.plan.update({ where: { id: id }, data: { isActive: isActive } });

      return {
        message: (isActive) ? "Plan activated successfully" : "Plan deactivated successfully",
        plan: updatedPlan,
        status: HttpStatus.OK
      }

    } catch (error) {
      throw error;
    }
  }

  async supscribe(id: string) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: id, isActive: true, isDeleted: false },
    });

    if (!plan) throw new HttpException({ message: 'Plan not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);

    return {
      message: "Plan subscribed successfully",
      plan: plan,
      status: HttpStatus.OK
    }
  }
}
