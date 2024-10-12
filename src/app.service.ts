import { Injectable } from '@nestjs/common';
import { StripeService } from './stripe/stripe.service';
@Injectable()
export class AppService {

  constructor(private readonly stripeService: StripeService) { }
  async getSession(id: string) {
    // return await this.stripeService.getSession(id);
    return await this.stripeService.refundInvoice('pi_3Q8lggQmWoP9SDEI1n6gpUCt');
  }
}
