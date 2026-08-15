import type { Logger } from '@nestjs/common';
import { request, type IncomingMessage, type Server } from 'node:http';
import { Server as NetServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { startMetricsServer } from '../src/modules/observability/metrics-server';
import type { MetricsService } from '../src/modules/observability/metrics.service';

/**
 * Bu server T-03 tuzatishining o'zagi: nginx asosiy ilova portidan boshqasiga
 * ulanmaydi, shu sabab bu yerda ko'tarilgan har narsa tuzilma jihatidan
 * tashqariga chiqib ketolmaydi. Testlar shuni tekshiradi — server aynan
 * `MetricsService` dan olgan narsani, boshqa hech narsani bermaydi.
 */
describe('startMetricsServer', () => {
  let logger: jest.Mocked<Pick<Logger, 'log' | 'error'>>;

  beforeEach(() => {
    logger = { log: jest.fn(), error: jest.fn() };
  });

  /** `listen(0, ...)` port tayinlanishi asinxron — `.address()` shu hodisadan keyin haqiqiy. */
  function waitForListening(server: Server): Promise<number> {
    return new Promise((resolve) => {
      server.once('listening', () => resolve((server.address() as AddressInfo).port));
    });
  }

  function fetchFrom(port: number, path: string): Promise<{ status: number; body: string; contentType?: string }> {
    return new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path, method: 'GET' }, (res: IncomingMessage) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body,
            contentType: res.headers['content-type'],
          }),
        );
      });
      req.on('error', reject);
      req.end();
    });
  }

  function makeMetricsService(overrides: Partial<Pick<MetricsService, 'metrics' | 'contentType'>> = {}) {
    return {
      metrics: jest.fn().mockResolvedValue(''),
      contentType: jest.fn().mockReturnValue('text/plain'),
      ...overrides,
    } as unknown as jest.Mocked<MetricsService>;
  }

  it('registr matnini va content-type ni MetricsService dan aynan qaytaradi', async () => {
    const metricsService = makeMetricsService({
      metrics: jest.fn().mockResolvedValue('yuton_http_requests_total 42\n'),
      contentType: jest.fn().mockReturnValue('text/plain; version=0.0.4; charset=utf-8'),
    });

    const server = startMetricsServer(metricsService, 0, logger as unknown as Logger);
    try {
      const port = await waitForListening(server);
      const res = await fetchFrom(port, '/metrics');

      expect(res.status).toBe(200);
      expect(res.body).toBe('yuton_http_requests_total 42\n');
      expect(res.contentType).toBe('text/plain; version=0.0.4; charset=utf-8');
    } finally {
      server.close();
    }
  });

  it("bo'sh yo'l (`/`) ham xuddi `/metrics` kabi ishlaydi", async () => {
    const metricsService = makeMetricsService({ metrics: jest.fn().mockResolvedValue('ok\n') });

    const server = startMetricsServer(metricsService, 0, logger as unknown as Logger);
    try {
      const port = await waitForListening(server);
      const res = await fetchFrom(port, '/');
      expect(res.status).toBe(200);
    } finally {
      server.close();
    }
  });

  it("noma'lum yo'l 404 qaytaradi — bu tinglagichda boshqa hech qanday marshrut yo'q", async () => {
    const metricsService = makeMetricsService();

    const server = startMetricsServer(metricsService, 0, logger as unknown as Logger);
    try {
      const port = await waitForListening(server);
      const res = await fetchFrom(port, '/anything-else');
      expect(res.status).toBe(404);
      expect(metricsService.metrics).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it('registr yig‘ish paytida yiqilsa — 500 qaytaradi va jarayon qulamaydi', async () => {
    const metricsService = makeMetricsService({
      metrics: jest.fn().mockRejectedValue(new Error('collector crashed')),
    });

    const server = startMetricsServer(metricsService, 0, logger as unknown as Logger);
    try {
      const port = await waitForListening(server);
      const res = await fetchFrom(port, '/metrics');
      expect(res.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('collector crashed'));
    } finally {
      server.close();
    }
  });

  it("`.unref()` chaqiriladi — yagona ochiq handle bo'lganda jarayonni ushlab turmasin", () => {
    // Nest watch-rejimida qayta ishga tushishda eski jarayon shu portni band
    // qilib qolmasligi shart — aks holda yangisi EADDRINUSE bilan yiqiladi.
    const unrefSpy = jest.spyOn(NetServer.prototype, 'unref');
    const metricsService = makeMetricsService();

    const server = startMetricsServer(metricsService, 0, logger as unknown as Logger);
    try {
      expect(unrefSpy).toHaveBeenCalledTimes(1);
    } finally {
      server.close();
      unrefSpy.mockRestore();
    }
  });
});
