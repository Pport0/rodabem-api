const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('rodabem_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function handleResponse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.message ||
      (Array.isArray(data?.message) ? data.message.join(', ') : null) ||
      `Erro ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return data;
}

// ── AUTH ─────────────────────────────────────────────
export async function apiLogin(cpf: string, senha: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, senha }),
  });
  return handleResponse(res);
}

export async function apiLogout() {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ── USERS ─────────────────────────────────────────────
export async function apiCreateUser(data: {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
  telefone: string;
}) {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiGetUsers(params?: { page?: number; limit?: number; nome?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.nome) query.set('nome', params.nome);
  const res = await fetch(`${BASE_URL}/users?${query.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiUpdateUser(
  id: number,
  data: Partial<{ nome: string; email: string; telefone: string; avatarUrl: string }>
) {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function apiDeleteUser(id: number) {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}
