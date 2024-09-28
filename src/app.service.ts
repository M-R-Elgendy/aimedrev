import { Injectable } from '@nestjs/common';
import { StripeService } from './stripe/stripe.service';
@Injectable()
export class AppService {

  private stripeService = new StripeService();
  async getSession(id: string) {
    return await this.stripeService.getSession(id);
  }
}
