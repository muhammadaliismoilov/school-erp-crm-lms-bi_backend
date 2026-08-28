import { SetMetadata } from '@nestjs/common';
import type { GatedModule } from './gated-modules';

export const REQUIRES_MODULE_KEY = 'requiresModule';

/**
 * Kontroller yoki metodni maktab moduli bayrog'iga bog'laydi.
 *
 * Modul o'chiq bo'lsa `SchoolModuleGuard` 403 qaytaradi — CEO uchun ham
 * (u ham bayroqqa bo'ysunadi, shunda u maktab xodimi ko'rayotgan ekranni
 * aynan ko'radi).
 */
export const RequiresModule = (module: GatedModule) => SetMetadata(REQUIRES_MODULE_KEY, module);
