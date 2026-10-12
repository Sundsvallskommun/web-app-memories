import { Controller, Get, Res } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Response } from 'express';

@Controller()
export class HealthController {
  @Get('/health')
  @OpenAPI({ summary: 'Check that the service is up' })
  async health(@Res() response: Response) {
    return response.send({ status: 'ok' });
  }

  // The OpenShift startup and readiness probes call /health/up.
  @Get('/health/up')
  @OpenAPI({ summary: 'Check that the service is up (OpenShift probes)' })
  async healthUp(@Res() response: Response) {
    return response.send({ status: 'ok' });
  }
}
