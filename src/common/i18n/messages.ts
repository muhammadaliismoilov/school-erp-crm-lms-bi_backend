import { HttpStatus } from '@nestjs/common';
import type { LocalizedText } from './locale';

export const localizedMessages = {
  VALIDATION_FAILED: {
    uz: "Kiritilgan ma'lumotlar noto'g'ri",
    ru: 'Введенные данные некорректны',
    en: 'The submitted data is invalid',
  },
  REQUEST_FAILED: {
    uz: "So'rov bajarilmadi",
    ru: 'Запрос не выполнен',
    en: 'Request failed',
  },
  INTERNAL_SERVER_ERROR: {
    uz: 'Ichki server xatosi',
    ru: 'Внутренняя ошибка сервера',
    en: 'Internal server error',
  },
  AUTHENTICATION_REQUIRED: {
    uz: 'Autentifikatsiya talab qilinadi',
    ru: 'Требуется аутентификация',
    en: 'Authentication is required',
  },
  INSUFFICIENT_PERMISSIONS: {
    uz: 'Ruxsatlar yetarli emas',
    ru: 'Недостаточно прав',
    en: 'Insufficient permissions',
  },
  INVALID_CREDENTIALS: {
    uz: "Login yoki parol noto'g'ri",
    ru: 'Неверный логин или пароль',
    en: 'Invalid credentials',
  },
  REFRESH_TOKEN_INVALID: {
    uz: 'Refresh token muddati tugagan yoki bekor qilingan',
    ru: 'Refresh token истек или был отозван',
    en: 'Refresh token expired or revoked',
  },
  USER_ALREADY_EXISTS: {
    uz: 'Bunday username yoki email bilan foydalanuvchi mavjud',
    ru: 'Пользователь с таким username или email уже существует',
    en: 'User with this username or email already exists',
  },
  USER_NOT_FOUND: {
    uz: 'Foydalanuvchi topilmadi',
    ru: 'Пользователь не найден',
    en: 'User not found',
  },
  USER_IDENTITY_ALREADY_EXISTS: {
    uz: 'Bunday login, email, telefon, hujjat raqami yoki JShShIR bilan foydalanuvchi mavjud',
    ru: 'Пользователь с таким логином, email, телефоном, номером документа или ПИНФЛ уже существует',
    en: 'User with this login, email, phone, document number, or PINFL already exists',
  },
  USER_EMPTY_UPDATE: {
    uz: 'Yangilash uchun kamida bitta foydalanuvchi maydoni yuborilishi kerak',
    ru: 'Для обновления нужно отправить хотя бы одно поле пользователя',
    en: 'At least one user field must be provided',
  },
  ROLE_ALREADY_EXISTS: {
    uz: 'Rol allaqachon mavjud',
    ru: 'Роль уже существует',
    en: 'Role already exists',
  },
  ROLE_NOT_FOUND: {
    uz: 'Rol topilmadi',
    ru: 'Роль не найдена',
    en: 'Role not found',
  },
  ROLE_EMPTY_UPDATE: {
    uz: 'Yangilash uchun kamida bitta rol maydoni yuborilishi kerak',
    ru: 'Для обновления нужно отправить хотя бы одно поле роли',
    en: 'At least one role field must be provided',
  },
  SYSTEM_ROLE_PROTECTED: {
    uz: 'System rolni o‘chirish yoki nomini o‘zgartirish mumkin emas',
    ru: 'Системную роль нельзя удалить или переименовать',
    en: 'System role cannot be deleted or renamed',
  },
  APPEAL_NOT_FOUND: {
    uz: 'Murojaat topilmadi',
    ru: 'Обращение не найдено',
    en: 'Appeal not found',
  },
  APPEAL_EMPTY_UPDATE: {
    uz: 'Yangilash uchun kamida bitta murojaat maydoni yuborilishi kerak',
    ru: 'Для обновления нужно отправить хотя бы одно поле обращения',
    en: 'At least one appeal field must be provided',
  },
  INTEGRATION_ALREADY_EXISTS: {
    uz: 'Bunday kodli integratsiya allaqachon mavjud',
    ru: 'Интеграция с таким кодом уже существует',
    en: 'Integration code already exists',
  },
  INTEGRATION_NOT_FOUND: {
    uz: 'Integratsiya topilmadi',
    ru: 'Интеграция не найдена',
    en: 'Integration not found',
  },
  INTEGRATION_EMPTY_UPDATE: {
    uz: 'Yangilash uchun kamida bitta integratsiya maydoni yuborilishi kerak',
    ru: 'Для обновления нужно отправить хотя бы одно поле интеграции',
    en: 'At least one integration field must be provided',
  },
  INTEGRATION_CONFIG_INVALID: {
    uz: 'Integratsiya sozlamalari noto‘g‘ri to‘ldirilgan',
    ru: 'Настройки интеграции заполнены некорректно',
    en: 'Integration config is invalid',
  },
  UNKNOWN_ROLES: {
    uz: 'Nomaʼlum rollar',
    ru: 'Неизвестные роли',
    en: 'Unknown roles',
  },
  UNKNOWN_PERMISSIONS: {
    uz: 'Nomaʼlum ruxsatlar',
    ru: 'Неизвестные разрешения',
    en: 'Unknown permissions',
  },
  LEAD_NOT_FOUND: {
    uz: 'Lid topilmadi',
    ru: 'Лид не найден',
    en: 'Lead not found',
  },
  STUDENT_NOT_FOUND: {
    uz: "O'quvchi topilmadi",
    ru: 'Ученик не найден',
    en: 'Student not found',
  },
  PARENT_NOT_FOUND: {
    uz: 'Ota-ona topilmadi',
    ru: 'Родитель не найден',
    en: 'Parent not found',
  },
  CONTRACT_NOT_FOUND: {
    uz: 'Shartnoma topilmadi',
    ru: 'Договор не найден',
    en: 'Contract not found',
  },
  ROOM_NOT_FOUND: {
    uz: 'Xona topilmadi',
    ru: 'Комната не найдена',
    en: 'Room not found',
  },
  ROOM_ALREADY_EXISTS: {
    uz: 'Bunday xona raqami allaqachon mavjud',
    ru: 'Комната с таким номером уже существует',
    en: 'Room number already exists',
  },
  CLASS_NOT_FOUND: {
    uz: 'Sinf topilmadi',
    ru: 'Класс не найден',
    en: 'Class not found',
  },
  CLASS_ALREADY_EXISTS: {
    uz: 'Bu o‘quv yilida bunday sinf allaqachon mavjud',
    ru: 'Такой класс уже существует в этом учебном году',
    en: 'Class already exists for this academic year',
  },
  SUBJECT_NOT_FOUND: {
    uz: "Fan topilmadi",
    ru: "Предмет не найден",
    en: "Subject not found",
  },
  SUBJECT_ALREADY_EXISTS: {
    uz: "Bunday fan nomi yoki kodi allaqachon mavjud",
    ru: "Предмет с таким названием или кодом уже существует",
    en: "Subject name or code already exists",
  },
  COURSE_NOT_FOUND: {
    uz: "Kurs topilmadi",
    ru: "Курс не найден",
    en: "Course not found",
  },
  COURSE_ALREADY_EXISTS: {
    uz: "Bu chorakda bunday kurs allaqachon mavjud",
    ru: "Такой курс уже существует в этой четверти",
    en: "Course already exists for this quarter",
  },
  COURSE_STUDENTS_NOT_FOUND: {
    uz: "Tanlangan o‘quvchilardan ayrimlari topilmadi",
    ru: "Некоторые выбранные ученики не найдены",
    en: "Some selected students were not found",
  },
  SCHOOL_NOT_FOUND: {
    uz: "Maktab topilmadi",
    ru: "Школа не найдена",
    en: "School not found",
  },
  SCHOOL_ALREADY_EXISTS: {
    uz: "Bunday nomdagi maktab allaqachon mavjud",
    ru: "Школа с таким названием уже существует",
    en: "School already exists",
  },
  SCHOOL_CAPACITY_INVALID: {
    uz: "Boshlang‘ich va yuqori sinflar sig‘imi umumiy sig‘imga teng bo‘lishi kerak",
    ru: "Сумма вместимости начальных и старших классов должна быть равна общей вместимости",
    en: "School capacity sections must equal total capacity",
  },
  TOO_MANY_REQUESTS: {
    uz: "So'rovlar soni juda ko'p",
    ru: 'Слишком много запросов',
    en: 'Too many requests',
  },
} satisfies Record<string, LocalizedText>;

const statusCodeMessages: Record<number, keyof typeof localizedMessages> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'AUTHENTICATION_REQUIRED',
  [HttpStatus.FORBIDDEN]: 'INSUFFICIENT_PERMISSIONS',
  [HttpStatus.NOT_FOUND]: 'REQUEST_FAILED',
  [HttpStatus.CONFLICT]: 'REQUEST_FAILED',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

const exactMessageToCode: Record<string, keyof typeof localizedMessages> = {
  'Authentication is required': 'AUTHENTICATION_REQUIRED',
  'Insufficient permissions': 'INSUFFICIENT_PERMISSIONS',
  'Invalid credentials': 'INVALID_CREDENTIALS',
  'Refresh token expired or revoked': 'REFRESH_TOKEN_INVALID',
  'User with this username or email already exists': 'USER_ALREADY_EXISTS',
  'User not found': 'USER_NOT_FOUND',
  'User with this identity fields already exists': 'USER_IDENTITY_ALREADY_EXISTS',
  'At least one user field must be provided': 'USER_EMPTY_UPDATE',
  'Role already exists': 'ROLE_ALREADY_EXISTS',
  'Role not found': 'ROLE_NOT_FOUND',
  'At least one role field must be provided': 'ROLE_EMPTY_UPDATE',
  'System role cannot be deleted': 'SYSTEM_ROLE_PROTECTED',
  'System role name cannot be changed': 'SYSTEM_ROLE_PROTECTED',
  'Appeal not found': 'APPEAL_NOT_FOUND',
  'At least one appeal field must be provided': 'APPEAL_EMPTY_UPDATE',
  'Integration code already exists': 'INTEGRATION_ALREADY_EXISTS',
  'Integration not found': 'INTEGRATION_NOT_FOUND',
  'At least one integration field must be provided': 'INTEGRATION_EMPTY_UPDATE',
  'Integration config is invalid': 'INTEGRATION_CONFIG_INVALID',
  'Lead not found': 'LEAD_NOT_FOUND',
  'Student not found': 'STUDENT_NOT_FOUND',
  'Parent not found': 'PARENT_NOT_FOUND',
  'Contract not found': 'CONTRACT_NOT_FOUND',
  'Room not found': 'ROOM_NOT_FOUND',
  'Room number already exists': 'ROOM_ALREADY_EXISTS',
  'Class not found': 'CLASS_NOT_FOUND',
  'Class already exists for this academic year': 'CLASS_ALREADY_EXISTS',
  'Subject not found': 'SUBJECT_NOT_FOUND',
  'Subject already exists': 'SUBJECT_ALREADY_EXISTS',
  'Course not found': 'COURSE_NOT_FOUND',
  'Course already exists for this quarter': 'COURSE_ALREADY_EXISTS',
  'Some selected students were not found': 'COURSE_STUDENTS_NOT_FOUND',
  'School not found': 'SCHOOL_NOT_FOUND',
  'School already exists': 'SCHOOL_ALREADY_EXISTS',
  'School capacity sections must equal total capacity': 'SCHOOL_CAPACITY_INVALID',
};

export const resolveErrorCode = (
  statusCode: number,
  message?: unknown,
): keyof typeof localizedMessages => {
  if (typeof message === 'string') {
    if (message.startsWith('Unknown roles:')) {
      return 'UNKNOWN_ROLES';
    }

    if (message.startsWith('Unknown permissions:')) {
      return 'UNKNOWN_PERMISSIONS';
    }

    const exact = exactMessageToCode[message];
    if (exact) {
      return exact;
    }
  }

  return statusCodeMessages[statusCode] ?? 'REQUEST_FAILED';
};

export const getLocalizedMessage = (
  code: keyof typeof localizedMessages | string,
): LocalizedText =>
  localizedMessages[code as keyof typeof localizedMessages] ??
  localizedMessages.REQUEST_FAILED;
