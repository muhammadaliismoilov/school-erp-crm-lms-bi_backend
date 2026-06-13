export const OPERATIONAL_QUEUE = 'operational';

export type OperationalJobName = 'daily-maintenance' | 'storage-backup-check';

export interface OperationalJobData {
  requestedAt: string;
  requestedBy: 'system' | string;
}
