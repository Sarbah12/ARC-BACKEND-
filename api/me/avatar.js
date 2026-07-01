import multer from 'multer';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

function runMulter(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('avatar')(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { id: payload.sub || payload.id };
  } catch {
    return null;
  }
}

const EXT_BY_MIME = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

export default async function handler(req, res) {
  const block = allowMethods(req, res, ['POST', 'OPTIONS']);
  if (block) return;

  const user = getUser(req);
  if (!user) return unauthorized(res);

  try {
    await runMulter(req, res);
  } catch (err) {
    return badRequest(res, err.message || 'Upload failed.');
  }

  if (!req.file) return badRequest(res, 'No image file was uploaded, or the file type is not supported (PNG, JPEG, WEBP, GIF only, max 5MB).');

  const ext = EXT_BY_MIME[req.file.mimetype] || 'jpg';
  const path = `${user.id}/${Date.now()}.${ext}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatar_url = publicUrlData.publicUrl;

    const { data: updated, error } = await supabase
      .from('users')
      .update({ avatar_url, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('id, first_name, last_name, email, phone, course_interest, role, avatar_url, google_id, created_at')
      .single();
    if (error) throw error;

    return ok(res, { user: updated });
  } catch (err) {
    console.error('[me/avatar POST]', err);
    return serverError(res);
  }
}
