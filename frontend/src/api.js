const TOKEN_KEY = 'leitner_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

async function request(method, path, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(data.error || 'Error inesperado', res.status, data.code);
  }
  return data;
}

export const api = {
  register: (b) => request('POST', '/auth/register', b),
  login: (b) => request('POST', '/auth/login', b),
  verifyEmail: (token) => request('POST', '/auth/verify-email', { token }),
  resendVerification: (email) => request('POST', '/auth/resend-verification', { email }),
  me: () => request('GET', '/auth/me'),

  listQuestions: (box) => request('GET', `/questions${box ? `?box=${box}` : ''}`),
  createQuestion: (b) => request('POST', '/questions', b),
  updateQuestion: (id, b) => request('PUT', `/questions/${id}`, b),
  deleteQuestion: (id) => request('DELETE', `/questions/${id}`),
  importQuestions: (list) => request('POST', '/questions/import', list),

  boxes: () => request('GET', '/study/boxes'),
  session: () => request('GET', '/study/session'),
  review: (id, correct) => request('POST', `/study/review/${id}`, { correct }),
};
