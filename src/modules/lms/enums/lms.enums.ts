export enum LessonStatus { PLANNED = 'planned', COMPLETED = 'completed', CANCELLED = 'cancelled' }
export enum ExamStatus { DRAFT = 'draft', SCHEDULED = 'scheduled', FINISHED = 'finished' }

/** Imtihon rejimi: sinf imtihoni yoki kurs imtihoni. */
export enum ExamKind { CLASS = 'class', COURSE = 'course' }

/** Imtihon turi: Test, Nazorat ishi, Diktant. */
export enum ExamType { TEST = 'test', CONTROL_WORK = 'control_work', DICTATION = 'dictation' }
