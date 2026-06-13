import type { LocalizedText } from '../i18n/locale';

/**
 * Metadata-driven permission catalog.
 *
 * The `permissions` table is the source of truth for *which* permission codes
 * exist. This file adds presentation metadata on top: it groups every
 * `module.action` code into a friendly category → resource → action tree with
 * localized labels for the Roles management UI.
 *
 * Anything not explicitly mapped falls back to the "Boshqa" (Other) category and
 * a humanized label, so the catalog never breaks when new permissions are added.
 */

export type PermissionCategoryKey =
  | 'talim'
  | 'moliya'
  | 'hr'
  | 'crm'
  | 'kutubxona'
  | 'salomatlik'
  | 'muloqot'
  | 'statistika'
  | 'boshqaruv'
  | 'boshqa';

export interface PermissionCategoryMeta {
  key: PermissionCategoryKey;
  label: LocalizedText;
  /** Display order in the UI. */
  order: number;
}

/** Ordered category definitions shown as accordion sections in the role editor. */
export const PERMISSION_CATEGORIES: PermissionCategoryMeta[] = [
  { key: 'talim', order: 1, label: { uz: "Ta'lim", ru: 'Образование', en: 'Education' } },
  { key: 'moliya', order: 2, label: { uz: 'Moliya', ru: 'Финансы', en: 'Finance' } },
  { key: 'hr', order: 3, label: { uz: 'HR', ru: 'HR', en: 'HR' } },
  { key: 'crm', order: 4, label: { uz: 'CRM va lidlar', ru: 'CRM и лиды', en: 'CRM & leads' } },
  { key: 'kutubxona', order: 5, label: { uz: 'Kutubxona', ru: 'Библиотека', en: 'Library' } },
  { key: 'salomatlik', order: 6, label: { uz: 'Salomatlik', ru: 'Здоровье', en: 'Health' } },
  { key: 'muloqot', order: 7, label: { uz: 'Muloqot', ru: 'Коммуникации', en: 'Communication' } },
  {
    key: 'statistika',
    order: 8,
    label: { uz: 'Statistika va BI', ru: 'Статистика и BI', en: 'Statistics & BI' },
  },
  { key: 'boshqaruv', order: 9, label: { uz: 'Boshqaruv', ru: 'Управление', en: 'Management' } },
  { key: 'boshqa', order: 10, label: { uz: 'Boshqa', ru: 'Прочее', en: 'Other' } },
];

/** Maps each permission module to a category. Unmapped modules → 'boshqa'. */
export const MODULE_CATEGORY: Record<string, PermissionCategoryKey> = {
  academic: 'talim',
  attendance: 'talim',
  lms: 'talim',
  timetable: 'talim',
  students: 'talim',
  admissions: 'talim',
  gamification: 'talim',

  finance: 'moliya',
  'advanced-finance': 'moliya',
  procurement: 'moliya',
  assets: 'moliya',
  inventory: 'moliya',

  hr: 'hr',

  crm: 'crm',

  library: 'kutubxona',
  documents: 'kutubxona',

  'health-safety': 'salomatlik',
  counseling: 'salomatlik',

  communication: 'muloqot',
  notifications: 'muloqot',
  appeals: 'muloqot',
  feedback: 'muloqot',

  analytics: 'statistika',
  reports: 'statistika',
  kpi: 'statistika',

  settings: 'boshqaruv',
  roles: 'boshqaruv',
  users: 'boshqaruv',
  'access-control': 'boshqaruv',
  integrations: 'boshqaruv',
  workflow: 'boshqaruv',
  files: 'boshqaruv',
  'data-jobs': 'boshqaruv',
  'mobile-portal': 'boshqaruv',
  transport: 'boshqaruv',
  youth: 'boshqaruv',
};

/** Localized labels for each module (resource group). */
export const MODULE_LABEL: Record<string, LocalizedText> = {
  academic: { uz: 'Akademik', ru: 'Учебная часть', en: 'Academic' },
  attendance: { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' },
  lms: { uz: 'Onlayn taʼlim (LMS)', ru: 'LMS', en: 'LMS' },
  timetable: { uz: 'Dars jadvali', ru: 'Расписание', en: 'Timetable' },
  students: { uz: "O'quvchilar", ru: 'Ученики', en: 'Students' },
  admissions: { uz: 'Qabul', ru: 'Приём', en: 'Admissions' },
  gamification: { uz: 'Gamifikatsiya', ru: 'Геймификация', en: 'Gamification' },

  finance: { uz: 'Moliya', ru: 'Финансы', en: 'Finance' },
  'advanced-finance': { uz: 'Kengaytirilgan moliya', ru: 'Расширенные финансы', en: 'Advanced finance' },
  procurement: { uz: 'Xaridlar', ru: 'Закупки', en: 'Procurement' },
  assets: { uz: 'Aktivlar', ru: 'Активы', en: 'Assets' },
  inventory: { uz: 'Inventar', ru: 'Инвентарь', en: 'Inventory' },

  hr: { uz: 'Xodimlar (HR)', ru: 'Персонал (HR)', en: 'HR' },

  crm: { uz: 'CRM', ru: 'CRM', en: 'CRM' },

  library: { uz: 'Kutubxona', ru: 'Библиотека', en: 'Library' },
  documents: { uz: 'Hujjatlar', ru: 'Документы', en: 'Documents' },

  'health-safety': { uz: 'Sogʼliq va xavfsizlik', ru: 'Здоровье и безопасность', en: 'Health & safety' },
  counseling: { uz: 'Psixologik xizmat', ru: 'Психологическая служба', en: 'Counseling' },

  communication: { uz: 'Muloqot', ru: 'Коммуникации', en: 'Communication' },
  notifications: { uz: 'Bildirishnomalar', ru: 'Уведомления', en: 'Notifications' },
  appeals: { uz: 'Takliflar va shikoyatlar', ru: 'Обращения', en: 'Appeals' },
  feedback: { uz: 'Fikr-mulohaza', ru: 'Обратная связь', en: 'Feedback' },

  analytics: { uz: 'Analitika', ru: 'Аналитика', en: 'Analytics' },
  reports: { uz: 'Hisobotlar', ru: 'Отчёты', en: 'Reports' },
  kpi: { uz: 'KPI', ru: 'KPI', en: 'KPI' },

  settings: { uz: 'Sozlamalar', ru: 'Настройки', en: 'Settings' },
  roles: { uz: 'Rollar', ru: 'Роли', en: 'Roles' },
  users: { uz: 'Foydalanuvchilar', ru: 'Пользователи', en: 'Users' },
  'access-control': { uz: 'Kirish nazorati', ru: 'Контроль доступа', en: 'Access control' },
  integrations: { uz: 'Integratsiyalar', ru: 'Интеграции', en: 'Integrations' },
  workflow: { uz: 'Jarayonlar', ru: 'Процессы', en: 'Workflow' },
  files: { uz: 'Fayllar', ru: 'Файлы', en: 'Files' },
  'data-jobs': { uz: 'Maʼlumot vazifalari', ru: 'Задачи данных', en: 'Data jobs' },
  'mobile-portal': { uz: 'Mobil portal', ru: 'Мобильный портал', en: 'Mobile portal' },
  transport: { uz: 'Transport', ru: 'Транспорт', en: 'Transport' },
  youth: { uz: 'Yoshlar ishlari', ru: 'Молодёжные дела', en: 'Youth services' },

  '*': { uz: 'Tizim (barchasi)', ru: 'Система (все)', en: 'System (all)' },
};

/** Localized labels for each action verb. */
export const ACTION_LABEL: Record<string, LocalizedText> = {
  read: { uz: "Ko'rish", ru: 'Просмотр', en: 'Read' },
  create: { uz: 'Yaratish', ru: 'Создание', en: 'Create' },
  update: { uz: 'Tahrirlash', ru: 'Редактирование', en: 'Update' },
  delete: { uz: "O'chirish", ru: 'Удаление', en: 'Delete' },
  manage: { uz: 'Boshqarish', ru: 'Управление', en: 'Manage' },
  upload: { uz: 'Yuklash', ru: 'Загрузка', en: 'Upload' },
  '*': { uz: 'Barchasi', ru: 'Все', en: 'All' },
};

export function categoryForModule(module: string): PermissionCategoryKey {
  return MODULE_CATEGORY[module] ?? 'boshqa';
}

/** Falls back to a Title-cased label for modules/actions without explicit metadata. */
export function humanize(value: string): LocalizedText {
  const text = value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { uz: text, ru: text, en: text };
}

export function moduleLabel(module: string): LocalizedText {
  return MODULE_LABEL[module] ?? humanize(module);
}

export function actionLabel(action: string): LocalizedText {
  return ACTION_LABEL[action] ?? humanize(action);
}
