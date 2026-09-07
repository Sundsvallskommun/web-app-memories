import { App } from '@/app';
import { HealthController } from '@controllers/health.controller';
import { DocumentController } from '@controllers/document.controller';
import { LegalEntityController } from '@controllers/legal-entity.controller';

async function bootstrap() {
  const app = new App([HealthController, DocumentController, LegalEntityController]);

  app.listen();
}

bootstrap();
