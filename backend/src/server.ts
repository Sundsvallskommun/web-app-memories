import { App } from '@/app';
import { HealthController } from '@controllers/health.controller';
import { DocumentController } from '@controllers/document.controller';

async function bootstrap() {
  const app = new App([HealthController, DocumentController]);

  app.listen();

  // Warm the document cache in the background so the first user doesn't wait
  // ~5s while we walk through all upstream pages. Errors are swallowed inside
  // warmCache() — a slow/down upstream shouldn't keep the proxy from booting.
  void new DocumentController().warmCache();
}

bootstrap();
