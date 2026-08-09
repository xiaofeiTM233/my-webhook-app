// lib/api.ts
const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '请求失败');
  return json.data;
}

// Rules
export const api = {
  getRules: (params?: Record<string, string>) =>
    request<{ items: unknown[]; total: number }>(`/api/rules?${new URLSearchParams(params)}`),
  getRule: (id: string) => request(`/api/rules/${id}`),
  createRule: (body: unknown) => request('/api/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateRule: (id: string, body: unknown) => request(`/api/rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRule: (id: string) => request(`/api/rules/${id}`, { method: 'DELETE' }),
  toggleRule: (id: string, enabled: boolean) => request(`/api/rules/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),

  // Actions
  getActions: (params?: Record<string, string>) =>
    request<{ items: unknown[]; total: number }>(`/api/actions?${new URLSearchParams(params)}`),
  getAction: (id: string) => request(`/api/actions/${id}`),
  createAction: (body: unknown) => request('/api/actions', { method: 'POST', body: JSON.stringify(body) }),
  updateAction: (id: string, body: unknown) => request(`/api/actions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAction: (id: string) => request(`/api/actions/${id}`, { method: 'DELETE' }),
  toggleAction: (id: string, enabled: boolean) => request(`/api/actions/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
};
