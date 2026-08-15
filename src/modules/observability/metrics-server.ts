import { createServer, type Server } from 'node:http';
import type { Logger } from '@nestjs/common';
import type { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpoint — ASOSIY ilovadan (Nest/Express, `PORT`) butunlay
 * mustaqil port va HTTP quvurida (T-03).
 *
 * Sabab: production'da nginx `location / { proxy_pass ...; }` bilan HAR
 * qanday yo'lni, filtrsiz, API'ga uzatadi — shu sabab `/api/metrics` ham
 * ochiq internetga chiqib qolgan edi. `api` konteyneri hostga umuman
 * ochilmagan (`docker-compose.prod.yml` da `ports:` yo'q); yagona tashqi
 * eshik — nginx, va nginx bu YANGI portga hech qachon ulanmaydi. Shu sabab
 * bu yerdagi himoya konfiguratsiya intizomiga emas, tarmoq tuzilishiga
 * tayanadi: nginx buni proksi qila olmaydi, chunki bunday upstream'i yo'q.
 *
 * `.unref()` — server jarayonni band ushlab turmasin. Aks holda nest
 * watch-rejimida qayta ishga tushishda eski jarayon portni bo'shatmay,
 * yangisi `EADDRINUSE` bilan yiqiladi (xuddi shu turdagi xato boshqa portda
 * shu sessiyada uchragan edi).
 */
export function startMetricsServer(metricsService: MetricsService, port: number, logger: Logger): Server {
  const server = createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/metrics' || req.url === '/')) {
      metricsService
        .metrics()
        .then((body) => {
          res.writeHead(200, { 'Content-Type': metricsService.contentType() });
          res.end(body);
        })
        .catch((error: unknown) => {
          logger.error(
            `Metrikalarni yig'ishda xatolik: ${error instanceof Error ? error.message : String(error)}`,
          );
          res.writeHead(500);
          res.end();
        });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.unref();
  server.listen(port, '0.0.0.0', () => {
    logger.log(`Metrics: http://0.0.0.0:${port}/metrics (faqat ichki tarmoq)`);
  });

  return server;
}
