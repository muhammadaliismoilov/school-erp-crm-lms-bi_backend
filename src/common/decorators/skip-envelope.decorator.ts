import { SetMetadata } from '@nestjs/common';

export const SKIP_ENVELOPE_KEY = 'skipEnvelope';

/**
 * Javobni `{success, data, timestamp}` konvertiga o'ramaslikni belgilaydi.
 *
 * Kerak bo'ladigan joy: javob JSON emas, balki tashqi tizim kutadigan qat'iy
 * formatda bo'lgan endpointlar — masalan Prometheus `text/plain` eksporti.
 * Konvert bunday javobni buzadi va scraper uni o'qiy olmaydi.
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
