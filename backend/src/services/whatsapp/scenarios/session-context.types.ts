import type { DosageItem } from '../../ai/types.js';

/** JSON stored on conversation_sessions.context */
export interface DiagnosisPending {
  imageCount: number;
  lastSessionId?: string;
  lastAdvisorySummary?: string;
  dosageItems?: DosageItem[];
  technicalOnly?: boolean;
}

export interface SessionContext {
  diagnosis?: DiagnosisPending;
  chimbDrainage?: 'yes' | 'no' | 'unsure';
  activeMenu?: string;
  lastImageHash?: string;
}
