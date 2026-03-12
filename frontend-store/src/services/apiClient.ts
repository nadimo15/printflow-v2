/// <reference types="vite/client" />
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
    };

    const config: RequestInit = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);
        // Handle 204 No Content
        if (response.status === 204) {
            return { success: true };
        }
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || `HTTP error ${response.status}`);
        }

        // Since our backend returns { success: true, data: ... }, we just return that directly.
        return data;
    } catch (error: any) {
        console.error(`[apiClient] Fetch error for ${endpoint}:`, error);
        throw error;
    }
}
