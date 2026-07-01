import multer from 'multer';
import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import { ok, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('image')(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

// Admin-only cover image upload for blog posts, events, and projects.
// Returns a public URL to store in the record's cover_image/image_url field.
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;
  if (requireAdmin(req, res) !== true) return;

  try {
    await runMulter(req, res);
  } catch (err) {
    return badRequest(res, err.message || 'Upload failed.');
  }

  if (!req.file) return badRequest(res, 'No image file was uploaded, or the file type is not supported (PNG, JPEG, WEBP, GIF only, max 8MB).');

  const ext = EXT_BY_MIME[req.file.mimetype] || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('content-images')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('content-images').getPublicUrl(path);
    return ok(res, { url: publicUrlData.publicUrl });
  } catch (err) {
    console.error('[admin/upload POST]', err);
    return serverError(res);
  }
}
