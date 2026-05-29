import { supabase } from '../../../lib/supabase.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

const INTRO: Record<AdvisoryLanguage, string> = {
  en: 'Your recent recommendations:',
  ml: 'സമീപകാല ശുപാർശകൾ:',
  ta: 'சமீபத்திய பரிந்துரைகள்:',
  kn: 'ಇತ್ತೀಚಿನ ಶಿಫಾರಸುಗಳು:',
  hi: 'हाल की सिफारिशें:',
};

const NONE: Record<AdvisoryLanguage, string> = {
  en: 'No previous recommendations on file yet.\n\nSend a crop photo for Crop Assessment.',
  ml: 'മുൻ ശുപാർശകൾ ഇല്ല.\n\nവിളയുടെ ഫോട്ടോ അയച്ച് Crop Assessment ചെയ്യുക.',
  ta: 'முந்தைய பரிந்துரைகள் இல்லை.\n\nபயிர் படம் அனுப்பி Crop Assessment செய்யுங்கள்.',
  kn: 'ಹಿಂದಿನ ಶಿಫಾರಸುಗಳು ಇಲ್ಲ.\n\nಬೆಳೆ ಫೋಟೋ ಕಳುಹಿಸಿ Crop Assessment ಮಾಡಿ.',
  hi: 'पहले की कोई सिफारिश नहीं।\n\nफसल फोटो भेजकर Crop Assessment करें।',
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export const previousRecommendationsService = {
  async formatForFarmer(farmerId: string, language: AdvisoryLanguage, limit = 3): Promise<string> {
    const { data, error } = await supabase
      .from('recommendation_records')
      .select('issue_detected, recommendation_text, crop_type, status, created_at, outcome')
      .eq('farmer_id', farmerId)
      .in('status', ['communicated', 'applied', 'outcome_recorded', 'approved'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data?.length) {
      return NONE[language] ?? NONE.en;
    }

    const lines = data.map((row, i) => {
      const crop = row.crop_type ? String(row.crop_type) : 'crop';
      const issue = row.issue_detected
        ? String(row.issue_detected).slice(0, 80)
        : language === 'ml'
          ? 'പ്രശ്നം'
          : 'issue';
      const text = String(row.recommendation_text ?? '').slice(0, 160);
      const date = formatDate(String(row.created_at));
      const outcome = row.outcome ? ` (${row.outcome})` : '';
      return `${i + 1}. ${date} · ${crop}\n${issue}${outcome}\n${text}`;
    });

    return `${INTRO[language] ?? INTRO.en}\n\n${lines.join('\n\n')}`;
  },
};
