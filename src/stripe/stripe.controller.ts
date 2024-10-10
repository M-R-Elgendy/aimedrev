import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { StripeService } from './stripe.service';

import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';

@Controller('stripe')
export class StripeController {
    constructor(private readonly stripeService: StripeService) { }

    @Post('create-webhook')
    @UseGuards(AuthGuard, RoleGuard)
    // @Roles([Role.ADMIN])
    async createWebHookEndpoint() {
        const webhookEndpoint = await this.stripeService.createWebHookEndpoint();
        return webhookEndpoint;
    }

    @Post('webhook')
    async handleStripeWebhook(@Req() req: Request) {
        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    }
}
