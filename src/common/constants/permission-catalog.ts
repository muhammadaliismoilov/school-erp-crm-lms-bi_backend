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
  'grade-requests': 'talim',
  'parent-communications': 'talim',
  'notification-templates': 'muloqot',
  'notification-queue': 'muloqot',
  'appeals-public-link': 'muloqot',
  'settings-school': 'boshqaruv',
  'settings-rooms': 'boshqaruv',
  'communication-templates': 'muloqot',
  'communication-campaigns': 'muloqot',
  'communication-deliveries': 'muloqot',
  'feedback-tickets': 'muloqot',
  'feedback-comments': 'muloqot',
  'youth-meal-menus': 'boshqaruv',
  'youth-requests': 'boshqaruv',
  'kpi-metrics': 'statistika',
  'kpi-results': 'statistika',
  'workflow-approvals': 'boshqaruv',
  'access-control-devices': 'boshqaruv',
  'access-control-face-profiles': 'boshqaruv',
  'access-control-events': 'boshqaruv',
  'transactions': 'moliya',
  'transaction-payment-types': 'moliya',
  'transaction-categories': 'moliya',
  'transaction-change-requests': 'moliya',
  'document-templates': 'kutubxona',
  'document-sign-requests': 'kutubxona',
  'procurement-vendors': 'moliya',
  'procurement-requests': 'moliya',
  'procurement-orders': 'moliya',
  'procurement-receipts': 'moliya',
  'assets-items': 'moliya',
  'assets-maintenance': 'moliya',
  'assets-depreciations': 'moliya',
  'advanced-finance-invoices': 'moliya',
  'advanced-finance-scholarships': 'moliya',
  'advanced-finance-refunds': 'moliya',
  'advanced-finance-cashboxes': 'moliya',
  'advanced-finance-bank-transactions': 'moliya',
  'transport-vehicles': 'boshqaruv',
  'transport-routes': 'boshqaruv',
  'transport-stops': 'boshqaruv',
  'transport-assignments': 'boshqaruv',
  'transport-trips': 'boshqaruv',
  'health-safety-records': 'salomatlik',
  'health-safety-nurse-visits': 'salomatlik',
  'health-safety-incidents': 'salomatlik',
  'health-safety-drills': 'salomatlik',
  'crm-leads': 'crm',
  'crm-lead-comments': 'crm',
  'crm-tags': 'crm',
  'crm-sources': 'crm',
  'crm-referrals': 'crm',
  'admissions-pipelines': 'talim',
  'admissions-stages': 'talim',
  'admissions-applications': 'talim',
  'admissions-exams': 'talim',
  'admissions-decisions': 'talim',
  'library-books': 'kutubxona',
  'library-copies': 'kutubxona',
  'library-loans': 'kutubxona',
  'library-reservations': 'kutubxona',
  'inventory-categories': 'moliya',
  'inventory-items': 'moliya',
  'inventory-transactions': 'moliya',
  academic: 'talim',
  'academic-years': 'talim',
  'academic-quarters': 'talim',
  'academic-lesson-periods': 'talim',
  'academic-subjects': 'talim',
  'academic-courses': 'talim',
  'academic-classes': 'talim',
  attendance: 'talim',
  'attendance-records': 'talim',
  'turnstile-devices': 'talim',
  'class-sessions': 'talim',
  'session-attendance': 'talim',
  'attendance-settings': 'talim',
  'timetable-templates': 'talim',
  'timetable-slots': 'talim',
  'timetable-substitutions': 'talim',
  'timetable-conflicts': 'talim',
  'homework-assignments': 'talim',
  'homework-submissions': 'talim',
  lms: 'talim',
  'lms-gradebook': 'talim',
  'lms-journal': 'talim',
  'lms-exam-results': 'talim',
  'lms-exams': 'talim',
  'lms-lessons': 'talim',
  timetable: 'talim',
  students: 'talim',
  'student-parents': 'talim',
  'student-documents': 'talim',
  admissions: 'talim',
  gamification: 'talim',
  'gamification-badges': 'talim',
  'gamification-wallets': 'talim',
  'gamification-coins': 'talim',
  'gamification-coin-presets': 'talim',

  finance: 'moliya',
  'finance-contracts': 'moliya',
  'finance-payments': 'moliya',
  'finance-teacher-rates': 'moliya',
  'finance-salaries': 'moliya',
  'advanced-finance': 'moliya',
  procurement: 'moliya',
  assets: 'moliya',
  inventory: 'moliya',

  hr: 'hr',
  'hr-branches': 'hr',
  'hr-departments': 'hr',
  'hr-positions': 'hr',
  'hr-staff': 'hr',
  'hr-staff-certificates': 'hr',
  'hr-staff-achievements': 'hr',
  'hr-leaves': 'hr',
  'hr-tasks': 'hr',
  'hr-attendance': 'hr',
  'hr-payrolls': 'hr',
  'hr-candidates': 'hr',
  'hr-geofences': 'hr',
  'hr-payments': 'hr',
  'hr-interactions': 'hr',
  'hr-performance-reviews': 'hr',
  'hr-projects': 'hr',
  'hr-surveys': 'hr',
  'hr-teachers': 'hr',
  'hr-timesheets': 'hr',
  'hr-vacancies': 'hr',
  'hr-work-schedules': 'hr',
  'hr-statistics': 'hr',

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
  'grade-requests': { uz: "Baho o'zgartirish so'rovlari", ru: 'Запросы на изменение оценок', en: 'Grade change requests' },
  'parent-communications': { uz: "Ota-onalar bilan muloqot", ru: 'Коммуникации с родителями', en: 'Parent communications' },
  'notification-templates': { uz: "Bildirishnoma shablonlari", ru: 'Шаблоны уведомлений', en: 'Notification templates' },
  'notification-queue': { uz: "Bildirishnoma navbati", ru: 'Очередь уведомлений', en: 'Notification queue' },
  'appeals-public-link': { uz: "Ommaviy havola (appeal)", ru: 'Публичная ссылка', en: 'Public link' },
  'settings-school': { uz: "Maktab sozlamalari", ru: 'Настройки школы', en: 'School settings' },
  'settings-rooms': { uz: "Xonalar", ru: 'Кабинеты', en: 'Rooms' },
  'communication-templates': { uz: "Xabar shablonlari", ru: 'Шаблоны сообщений', en: 'Message templates' },
  'communication-campaigns': { uz: "Kampaniyalar", ru: 'Кампании', en: 'Campaigns' },
  'communication-deliveries': { uz: "Yetkazishlar", ru: 'Доставки', en: 'Deliveries' },
  'feedback-tickets': { uz: "Murojaatlar (ticket)", ru: 'Обращения', en: 'Tickets' },
  'feedback-comments': { uz: "Murojaat izohlari", ru: 'Комментарии обращений', en: 'Ticket comments' },
  'youth-meal-menus': { uz: "Ovqat menyulari", ru: 'Меню питания', en: 'Meal menus' },
  'youth-requests': { uz: "Yoshlar so'rovlari", ru: 'Молодёжные запросы', en: 'Youth requests' },
  'kpi-metrics': { uz: "KPI ko'rsatkichlari", ru: 'KPI метрики', en: 'KPI metrics' },
  'kpi-results': { uz: "KPI natijalari", ru: 'KPI результаты', en: 'KPI results' },
  'workflow-approvals': { uz: "Tasdiqlashlar", ru: 'Согласования', en: 'Approvals' },
  'access-control-devices': { uz: "Kirish qurilmalari", ru: 'Устройства доступа', en: 'Access devices' },
  'access-control-face-profiles': { uz: "Yuz profillari (FaceID)", ru: 'Профили лиц', en: 'Face profiles' },
  'access-control-events': { uz: "Kirish hodisalari", ru: 'События доступа', en: 'Access events' },
  'transactions': { uz: "Tranzaksiyalar", ru: 'Транзакции', en: 'Transactions' },
  'transaction-payment-types': { uz: "To'lov turlari", ru: 'Типы платежей', en: 'Payment types' },
  'transaction-categories': { uz: "Tranzaksiya kategoriyalari", ru: 'Категории транзакций', en: 'Transaction categories' },
  'transaction-change-requests': { uz: "O'zgartirish so'rovlari", ru: 'Запросы на изменение', en: 'Change requests' },
  'document-templates': { uz: "Hujjat shablonlari", ru: 'Шаблоны документов', en: 'Document templates' },
  'document-sign-requests': { uz: "Imzo so'rovlari", ru: 'Запросы на подпись', en: 'Sign requests' },
  'procurement-vendors': { uz: "Yetkazib beruvchilar", ru: 'Поставщики', en: 'Vendors' },
  'procurement-requests': { uz: "Xarid so'rovlari", ru: 'Заявки на закупку', en: 'Purchase requests' },
  'procurement-orders': { uz: "Buyurtmalar", ru: 'Заказы', en: 'Orders' },
  'procurement-receipts': { uz: "Qabul hujjatlari", ru: 'Приёмки', en: 'Receipts' },
  'assets-items': { uz: "Aktiv buyumlari", ru: 'Активы', en: 'Asset items' },
  'assets-maintenance': { uz: "Texnik xizmat", ru: 'Обслуживание', en: 'Maintenance' },
  'assets-depreciations': { uz: "Amortizatsiya", ru: 'Амортизация', en: 'Depreciations' },
  'advanced-finance-invoices': { uz: "Hisob-fakturalar", ru: 'Счета', en: 'Invoices' },
  'advanced-finance-scholarships': { uz: "Stipendiyalar", ru: 'Стипендии', en: 'Scholarships' },
  'advanced-finance-refunds': { uz: "Qaytarishlar", ru: 'Возвраты', en: 'Refunds' },
  'advanced-finance-cashboxes': { uz: "Kassalar", ru: 'Кассы', en: 'Cashboxes' },
  'advanced-finance-bank-transactions': { uz: "Bank tranzaksiyalari", ru: 'Банковские транзакции', en: 'Bank transactions' },
  'transport-vehicles': { uz: "Transport vositalari", ru: 'Транспорт', en: 'Vehicles' },
  'transport-routes': { uz: "Marshrutlar", ru: 'Маршруты', en: 'Routes' },
  'transport-stops': { uz: "Bekatlar", ru: 'Остановки', en: 'Stops' },
  'transport-assignments': { uz: "Biriktirishlar", ru: 'Назначения', en: 'Assignments' },
  'transport-trips': { uz: "Reyslar", ru: 'Рейсы', en: 'Trips' },
  'health-safety-records': { uz: "Sog'liq yozuvlari", ru: 'Медкарты', en: 'Health records' },
  'health-safety-nurse-visits': { uz: "Tibbiyot xonasi tashrifi", ru: 'Визиты к медсестре', en: 'Nurse visits' },
  'health-safety-incidents': { uz: "Hodisalar", ru: 'Инциденты', en: 'Incidents' },
  'health-safety-drills': { uz: "Mashqlar (drill)", ru: 'Учения', en: 'Drills' },
  'crm-leads': { uz: "Lidlar", ru: 'Лиды', en: 'Leads' },
  'crm-lead-comments': { uz: "Lid izohlari", ru: 'Комментарии лида', en: 'Lead comments' },
  'crm-tags': { uz: "Teglar", ru: 'Теги', en: 'Tags' },
  'crm-sources': { uz: "Manbalar", ru: 'Источники', en: 'Sources' },
  'crm-referrals': { uz: "Yo'llanmalar (referral)", ru: 'Рефералы', en: 'Referrals' },
  'admissions-pipelines': { uz: "Qabul yo'nalishlari", ru: 'Воронки приёма', en: 'Admission pipelines' },
  'admissions-stages': { uz: "Qabul bosqichlari", ru: 'Этапы приёма', en: 'Admission stages' },
  'admissions-applications': { uz: "Arizalar", ru: 'Заявки', en: 'Applications' },
  'admissions-exams': { uz: "Qabul imtihonlari", ru: 'Вступительные экзамены', en: 'Entrance exams' },
  'admissions-decisions': { uz: "Qabul qarorlari", ru: 'Решения о приёме', en: 'Admission decisions' },
  'library-books': { uz: "Kitoblar", ru: 'Книги', en: 'Books' },
  'library-copies': { uz: "Kitob nusxalari", ru: 'Экземпляры', en: 'Book copies' },
  'library-loans': { uz: "Ijaralar (loan)", ru: 'Выдачи', en: 'Loans' },
  'library-reservations': { uz: "Bandlovlar", ru: 'Брони', en: 'Reservations' },
  'inventory-categories': { uz: "Inventar kategoriyalari", ru: 'Категории инвентаря', en: 'Inventory categories' },
  'inventory-items': { uz: "Inventar buyumlari", ru: 'Предметы инвентаря', en: 'Inventory items' },
  'inventory-transactions': { uz: "Inventar tranzaksiyalari", ru: 'Транзакции инвентаря', en: 'Inventory transactions' },
  academic: { uz: 'Akademik', ru: 'Учебная часть', en: 'Academic' },
  'academic-years': { uz: "O'quv yillari", ru: 'Учебные годы', en: 'Academic years' },
  'academic-quarters': { uz: 'Choraklar', ru: 'Четверти', en: 'Quarters' },
  'academic-lesson-periods': { uz: 'Dars davrlari', ru: 'Учебные периоды', en: 'Lesson periods' },
  'academic-subjects': { uz: 'Fanlar', ru: 'Предметы', en: 'Subjects' },
  'academic-courses': { uz: 'Kurslar', ru: 'Курсы', en: 'Courses' },
  'academic-classes': { uz: 'Sinflar (guruhlar)', ru: 'Классы (группы)', en: 'Classes (groups)' },
  attendance: { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' },
  'attendance-records': { uz: "O'quvchi davomati", ru: 'Посещаемость учеников', en: 'Student attendance' },
  'turnstile-devices': { uz: 'Turniket qurilmalari', ru: 'Турникетные устройства', en: 'Turnstile devices' },
  'class-sessions': { uz: 'Dars sessiyalari', ru: 'Учебные сессии', en: 'Class sessions' },
  'session-attendance': { uz: 'Sessiya davomati', ru: 'Посещаемость по сессиям', en: 'Session attendance' },
  'attendance-settings': { uz: 'Davomat sozlamalari', ru: 'Настройки посещаемости', en: 'Attendance settings' },
  'timetable-templates': { uz: 'Jadval shablonlari', ru: 'Шаблоны расписания', en: 'Timetable templates' },
  'timetable-slots': { uz: 'Jadval kataklari', ru: 'Ячейки расписания', en: 'Timetable slots' },
  'timetable-substitutions': { uz: 'Almashtirishlar', ru: 'Замены', en: 'Substitutions' },
  'timetable-conflicts': { uz: 'Jadval ziddiyatlari', ru: 'Конфликты расписания', en: 'Timetable conflicts' },
  'homework-assignments': { uz: 'Uy vazifalari', ru: 'Домашние задания', en: 'Homework assignments' },
  'homework-submissions': { uz: 'Uy vazifa topshiriqlari', ru: 'Сдачи домашних заданий', en: 'Homework submissions' },
  lms: { uz: 'Onlayn taʼlim (LMS)', ru: 'LMS', en: 'LMS' },
  'lms-gradebook': { uz: 'Baholar jurnali', ru: 'Журнал оценок', en: 'Gradebook' },
  'lms-journal': { uz: 'Dars jurnali (yozuvlar)', ru: 'Журнал занятий', en: 'Class journal' },
  'lms-exam-results': { uz: 'Imtihon natijalari', ru: 'Результаты экзаменов', en: 'Exam results' },
  'lms-exams': { uz: 'Imtihonlar', ru: 'Экзамены', en: 'Exams' },
  'lms-lessons': { uz: 'Dars jadvali (LMS)', ru: 'Расписание уроков (LMS)', en: 'Lesson schedule (LMS)' },
  timetable: { uz: 'Dars jadvali', ru: 'Расписание', en: 'Timetable' },
  students: { uz: "O'quvchilar", ru: 'Ученики', en: 'Students' },
  'student-parents': { uz: "O'quvchi ota-onalari", ru: 'Родители ученика', en: 'Student parents' },
  'student-documents': { uz: "O'quvchi hujjatlari", ru: 'Документы ученика', en: 'Student documents' },
  admissions: { uz: 'Qabul', ru: 'Приём', en: 'Admissions' },
  gamification: { uz: 'Gamifikatsiya', ru: 'Геймификация', en: 'Gamification' },
  'gamification-badges': { uz: 'Nishonlar (badge)', ru: 'Значки', en: 'Badges' },
  'gamification-wallets': { uz: "O'quvchi hamyoni (coin)", ru: 'Кошелёк ученика', en: 'Student wallet' },
  'gamification-coins': { uz: 'Coin tranzaksiyalari', ru: 'Транзакции коинов', en: 'Coin transactions' },
  'gamification-coin-presets': { uz: 'Coin shablonlari', ru: 'Шаблоны коинов', en: 'Coin presets' },

  finance: { uz: 'Moliya', ru: 'Финансы', en: 'Finance' },
  'finance-contracts': { uz: 'Shartnomalar', ru: 'Договоры', en: 'Contracts' },
  'finance-payments': { uz: "To'lovlar (shartnoma)", ru: 'Платежи (договор)', en: 'Payments (contract)' },
  'finance-teacher-rates': { uz: "O'qituvchi dars stavkalari", ru: 'Ставки учителей', en: 'Teacher lesson rates' },
  'finance-salaries': { uz: "O'qituvchi oyliklari", ru: 'Зарплаты учителей', en: 'Teacher salaries' },
  'advanced-finance': { uz: 'Kengaytirilgan moliya', ru: 'Расширенные финансы', en: 'Advanced finance' },
  procurement: { uz: 'Xaridlar', ru: 'Закупки', en: 'Procurement' },
  assets: { uz: 'Aktivlar', ru: 'Активы', en: 'Assets' },
  inventory: { uz: 'Inventar', ru: 'Инвентарь', en: 'Inventory' },

  hr: { uz: 'Xodimlar (HR)', ru: 'Персонал (HR)', en: 'HR' },
  'hr-branches': { uz: "Filiallar", ru: 'Филиалы', en: 'Branches' },
  'hr-departments': { uz: "Bo'limlar", ru: 'Отделы', en: 'Departments' },
  'hr-positions': { uz: "Lavozimlar", ru: 'Должности', en: 'Positions' },
  'hr-staff': { uz: "Xodimlar", ru: 'Сотрудники', en: 'Staff' },
  'hr-staff-certificates': { uz: "Xodim sertifikatlari", ru: 'Сертификаты сотрудника', en: 'Staff certificates' },
  'hr-staff-achievements': { uz: "Xodim yutuqlari", ru: 'Достижения сотрудника', en: 'Staff achievements' },
  'hr-leaves': { uz: "Ta'tillar / ruxsatlar", ru: 'Отпуска', en: 'Leaves' },
  'hr-tasks': { uz: "Vazifalar", ru: 'Задачи', en: 'Tasks' },
  'hr-attendance': { uz: "Xodim davomati", ru: 'Посещаемость сотрудников', en: 'Staff attendance' },
  'hr-payrolls': { uz: "Ish haqi (payroll)", ru: 'Начисления', en: 'Payrolls' },
  'hr-candidates': { uz: "Nomzodlar", ru: 'Кандидаты', en: 'Candidates' },
  'hr-geofences': { uz: "Geozonalar", ru: 'Геозоны', en: 'Geofences' },
  'hr-payments': { uz: "Xodim to'lovlari", ru: 'Выплаты сотрудникам', en: 'Staff payments' },
  'hr-interactions': { uz: "Muloqotlar", ru: 'Взаимодействия', en: 'Interactions' },
  'hr-performance-reviews': { uz: "Baholash (performance)", ru: 'Оценка эффективности', en: 'Performance reviews' },
  'hr-projects': { uz: "Loyihalar", ru: 'Проекты', en: 'Projects' },
  'hr-surveys': { uz: "So'rovnomalar", ru: 'Опросы', en: 'Surveys' },
  'hr-teachers': { uz: "O'qituvchilar", ru: 'Учителя', en: 'Teachers' },
  'hr-timesheets': { uz: "Ish vaqti tabeli", ru: 'Табели', en: 'Timesheets' },
  'hr-vacancies': { uz: "Vakansiyalar", ru: 'Вакансии', en: 'Vacancies' },
  'hr-work-schedules': { uz: "Ish jadvallari", ru: 'Графики работы', en: 'Work schedules' },
  'hr-statistics': { uz: "HR statistikasi", ru: 'HR статистика', en: 'HR statistics' },

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
