/** Structured AI advisory response — provider-agnostic */

export type AdvisoryLanguage = 'en' | 'ml' | 'ta' | 'kn' | 'hi';

export interface NutrientDeficiencyItem {
  nutrient: string;
  likelihood: 'low' | 'medium' | 'high';
  signs: string;
}

export interface TreatmentItem {
  action: string;
  productType?: string;
  timing?: string;
}

export interface DosageItem {
  product: string;
  rate: string;
  method: string;
  frequency?: string;
}

export interface StructuredAdvisory {
  probableIssue: string;
  confidence: number;
  uncertain: boolean;
  nutrientDeficiency: NutrientDeficiencyItem[];
  stressAnalysis: string[];
  treatments: TreatmentItem[];
  dosageGuidance: DosageItem[];
  precautions: string[];
  escalationRecommended: boolean;
  escalationReason?: string;
  farmerSummaryEn: string;
  farmerSummaryMl: string;
  recommendedProductTags: string[];
}

export interface PlantIdHealthResult {
  diseases?: Array<{ name: string; probability: number }>;
  suggestions?: Array<{ name: string; probability: number }>;
  isHealthy?: boolean;
  raw: Record<string, unknown>;
}

export interface DiagnoseInput {
  farmerId: string;
  phone?: string;
  cropType: string;
  cropStage?: string;
  language: AdvisoryLanguage;
  symptomsText?: string;
  voiceTranscript?: string;
  imageBase64?: string;
  imageMimeType?: string;
  /** Supabase storage path in advisory-images (set when farmer photo is persisted). */
  imageStoragePath?: string;
  channel: 'api' | 'whatsapp' | 'web';
  /** WhatsApp pipeline: minimal history string (low token cost) */
  compactHistory?: string;
  /** Optional structured context for post-analysis policy checks */
  contextPack?: Record<string, unknown>;
}

export interface DiagnoseResult {
  sessionId: string;
  advisory: StructuredAdvisory;
  productRecommendations: ProductRecommendation[];
  escalated: boolean;
  escalationId?: string;
  /** Scenario 38 — served from advisory_reuse_cases without OpenAI */
  reused?: boolean;
}

export interface ProductRecommendation {
  shopifyProductHandle?: string;
  productTitle: string;
  reason: string;
  dosageSchedule?: Record<string, string>;
  priority: number;
  comboKitId?: string;
}
