import { Controller, Get, Res } from 'routing-controllers';
import { Response } from 'express';

@Controller()
export class HealthController {
  @Get('/health')
  async health(@Res() response: Response) {
    return response.send({ status: 'ok' });
  }
}
