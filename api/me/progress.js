import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';
import { ok, unauthorized, badRequest, serverError, allowMethods } from '../../lib/helpers.js';

function getUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return { id: payload.sub || payload.id, email: payload.email };
  } catch {
    return null;
  }
}

// The course_progress table is optional — if it hasn't been created yet the
// dashboard should degrade quietly rather than throwing an alert at the learner.
function missingTable(error) {
  const m = `${error?.message || ''}`.toLowerCase();
  return error?.code === 'PGRST205' || m.includes('schema cache') || m.includes('does not exist');
}

// Tracks which lessons a learner has completed.
//   GET  -> { progress: [...] }
//   POST -> { course, lesson_id, completed } => { progress }
export default async function handler(req, res) {
  const block = allowMethods(req, res, ['GET', 'POST', 'OPTIONS']);
  if (block) return;

  const user = getUser(req);
  if (!user?.id) return unauthorized(res);

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('course_progress')
      .select('*')
      .eq('user_id', user.id);
    if (error) {
      if (missingTable(error)) return ok(res, { progress: [] });
      return serverError(res, error.message);
    }
    return ok(res, { progress: data || [] });
  }

  const course = String(req.body?.course || '').trim();
  const lessonId = String(req.body?.lesson_id || req.body?.lessonId || '').trim();
  const completed = req.body?.completed !== false;
  if (!course) return badRequest(res, 'course is required.');
  if (!lessonId) return badRequest(res, 'lesson_id is required.');

  const now = new Date().toISOString();

  // Un-completing simply removes the row.
  if (!completed) {
    const { error } = await supabase
      .from('course_progress')
      .delete()
      .eq('user_id', user.id)
      .eq('course', course)
      .eq('lesson_id', lessonId);
    if (error && !missingTable(error)) return serverError(res, error.message);
    return ok(res, { progress: null });
  }

  const row = {
    id: randomUUID(),
    user_id: user.id,
    user_email: user.email || '',
    course,
    lesson_id: lessonId,
    completed_at: now,
    updated_at: now,
  };

  // One row per (user, course, lesson) — upsert so re-marking is harmless.
  const { data, error } = await supabase
    .from('course_progress')
    .upsert(row, { onConflict: 'user_id,course,lesson_id' })
    .select()
    .single();

  if (error) {
    if (missingTable(error)) {
      return serverError(res, 'Progress tracking is not set up yet. Please contact an administrator.');
    }
    return serverError(res, error.message);
  }
  return ok(res, { progress: data });
}
