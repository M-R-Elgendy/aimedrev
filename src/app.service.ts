import { Injectable } from '@nestjs/common';
@Injectable()
export class AppService {
  async healthCheck() {
    return { name: 'AimedRev', status: 'OK', code: 200 };
  }
}
