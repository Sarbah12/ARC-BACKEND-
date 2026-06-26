export function respond(res, status, data) {
  return res.status(status).json(data);
}

export function ok(res, data) {
  return respond(res, 200, { success: true, ...data });
}

export function created(res, data) {
  return respond(res, 201, { success: true, ...data });
}

export function badRequest(res, message) {
  return respond(res, 400, { success: false, error: message });
}

export function unauthorized(res, message = 'Unauthorized') {
  return respond(res, 401, { success: false, error: message });
}

export function conflict(res, message) {
  return respond(res, 409, { success: false, error: message });
}

export function serverError(res, message = 'Internal server error') {
  return respond(res, 500, { success: false, error: message });
}

export function allowMethods(req, res, methods) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', methods.join(', '));
    return res.status(204).end();
  }
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    return respond(res, 405, { success: false, error: 'Method not allowed' });
  }
  return null;
}
