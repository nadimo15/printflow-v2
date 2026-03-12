/// <reference types="vite/client" />
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Extracts the JWT token from Zustand's persisted state in localStorage.
 * This avoids a circular dependency with authStore.ts.
 */
const getToken = (): string | null => {
    try {
        const authStorage = localStorage.getItem('erp-auth');
        if (!authStorage) return null;
        const parsed = JSON.parse(authStorage);
        return parsed?.state?.token || null;
    } catch (e) {
        return null;
    }
};

/**
 * Generic API request wrapper
 */
async function request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const token = getToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorMsg = 'An error occurred';
        try {
            const errData = await response.json();
            errorMsg = errData?.error?.message || errData.message || errorMsg;
        } catch {
            errorMsg = await response.text();
        }
        throw new Error(errorMsg);
    }

    return response.json();
}

export const apiClient = {
    get: (endpoint: string) => request(endpoint, { method: 'GET' }),
    post: (endpoint: string, data?: any) => request(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
    put: (endpoint: string, data: any) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    patch: (endpoint: string, data: any) => request(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (endpoint: string) => request(endpoint, { method: 'DELETE' }),
};
