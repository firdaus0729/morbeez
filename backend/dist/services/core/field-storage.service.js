import { randomUUID } from 'node:crypto';
import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../lib/errors.js';
const BUCKET = 'field-visits';
const MAX_BYTES = 5 * 1024 * 1024;
export const fieldStorageService = {
    async uploadPhotos(farmerId, files) {
        if (!files.length)
            return [];
        if (files.length > 8)
            throw new AppError('Maximum 8 photos per visit', 400, 'TOO_MANY_FILES');
        const urls = [];
        for (const file of files) {
            const raw = file.dataBase64.replace(/^data:[^;]+;base64,/, '');
            const buffer = Buffer.from(raw, 'base64');
            if (buffer.length > MAX_BYTES) {
                throw new AppError(`File ${file.filename} exceeds 5MB`, 400, 'FILE_TOO_LARGE');
            }
            const ext = file.mimeType === 'image/png'
                ? 'png'
                : file.mimeType === 'image/webp'
                    ? 'webp'
                    : 'jpg';
            const path = `${farmerId}/${randomUUID()}.${ext}`;
            const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
                contentType: file.mimeType || 'image/jpeg',
                upsert: false,
            });
            if (error) {
                throw new AppError(`Photo upload failed: ${error.message}. Ensure storage bucket "field-visits" exists.`, 502, 'STORAGE_UPLOAD_FAILED');
            }
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
            urls.push(data.publicUrl);
        }
        return urls;
    },
};
//# sourceMappingURL=field-storage.service.js.map