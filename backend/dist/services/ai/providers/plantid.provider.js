import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';
import { logger } from '../../../lib/logger.js';
export const plantIdProvider = {
    name: 'plantid',
    async assessHealth(input) {
        if (!env.PLANT_ID_API_KEY) {
            throw new AppError('Plant.id not configured', 503, 'PLANTID_NOT_CONFIGURED');
        }
        const started = Date.now();
        const res = await fetch('https://api.plant.id/v3/health_assessment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': env.PLANT_ID_API_KEY,
            },
            body: JSON.stringify({
                images: [`data:image/jpeg;base64,${input.imageBase64}`],
                similar_images: true,
            }),
        });
        if (!res.ok) {
            const text = await res.text();
            logger.error({ status: res.status, text }, 'Plant.id failed');
            throw new AppError('Plant.id assessment failed', res.status, 'PLANTID_FAILED', text);
        }
        const raw = (await res.json());
        logger.debug({ latencyMs: Date.now() - started }, 'Plant.id ok');
        const result = raw.result;
        const disease = result?.disease;
        const suggestions = disease?.suggestions ?? [];
        const diseases = suggestions.map((s) => ({
            name: String(s.name ?? 'unknown'),
            probability: Number(s.probability ?? 0),
        }));
        const isHealthy = diseases.length === 0 ||
            (diseases[0]?.probability ?? 0) < 0.15;
        return { diseases, isHealthy, raw };
    },
};
export function formatPlantIdSummary(result) {
    if (!result.diseases?.length)
        return 'No significant disease signals from Plant.id.';
    return result.diseases
        .slice(0, 5)
        .map((d) => `- ${d.name}: ${(d.probability * 100).toFixed(0)}%`)
        .join('\n');
}
//# sourceMappingURL=plantid.provider.js.map