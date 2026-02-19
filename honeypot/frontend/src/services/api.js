import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// --- Token helpers ---
const TOKEN_KEY = 'hb_access_token';
const REFRESH_KEY = 'hb_refresh_token';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (access, refresh) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
};

export const isAuthenticated = () => !!getAccessToken();

// --- Request interceptor: attach Bearer token or fallback API key ---
api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        // Fallback to legacy API key for backward compat
        const apiKey = import.meta.env.VITE_API_SECRET_KEY || 'unsafe-secret-key-change-me';
        config.headers['x-api-key'] = apiKey;
    }
    return config;
});

// --- Response interceptor: auto-refresh on 401, retry logic ---
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
    refreshQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    refreshQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Auto-refresh on 401 (only if we have a refresh token)
        if (error.response?.status === 401 && !originalRequest._retry && getRefreshToken()) {
            originalRequest._retry = true;

            if (isRefreshing) {
                // Queue requests while refresh is in flight
                return new Promise((resolve, reject) => {
                    refreshQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                });
            }

            isRefreshing = true;

            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refresh_token: getRefreshToken(),
                });
                setTokens(data.access_token, data.refresh_token);
                processQueue(null, data.access_token);
                originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearTokens();
                // Optionally redirect to login
                window.dispatchEvent(new CustomEvent('auth:logout'));
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // General retry logic (network errors, 5xx)
        if (!originalRequest.retry) originalRequest.retry = 3;
        originalRequest.retry -= 1;

        if (originalRequest.retry > 0 && (!error.response || error.response.status >= 500)) {
            const delay = originalRequest.retryDelay || 1000;
            originalRequest.retryDelay = delay * 2;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return api(originalRequest);
        }

        return Promise.reject(error);
    }
);

// --- Auth API calls ---
export const authRegister = async (username, password, displayName = '') => {
    const { data } = await api.post('/auth/register', { username, password, display_name: displayName });
    setTokens(data.access_token, data.refresh_token);
    return data;
};

export const authLogin = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    setTokens(data.access_token, data.refresh_token);
    return data;
};

export const authLogout = async () => {
    const refresh = getRefreshToken();
    if (refresh) {
        try { await api.post('/auth/logout', { refresh_token: refresh }); } catch {}
    }
    clearTokens();
};

export const authGetMe = async () => {
    const { data } = await api.get('/auth/me');
    return data;
};

export const fetchSessions = async (filters = {}) => {
    try {
        const response = await api.get('/sessions', {
            retry: 3,
            params: filters
        });
        return response.data;
    } catch (e) {
        console.warn("API Error fetching sessions", e);
        return [];
    }
};

export const fetchSession = async (sessionId) => {
    try {
        const response = await api.get(`/sessions/${sessionId}`, { retry: 3 });
        return response.data;
    } catch (e) {
        console.error("API Error fetching session detail", e);
        return null;
    }
};

export const simulateScamMessage = async (sessionId, text) => {
    try {
        const payload = {
            sessionId: sessionId,
            message: {
                sender: "scammer",
                text: text,
                timestamp: Date.now()
            },
            conversationHistory: [],
            metadata: {
                channel: "Simulation",
                language: "English"
            }
        };

        const response = await api.post('/message', payload);
        return response.data;
    } catch (e) {
        console.error("API Error sending message", e);
        return null;
    }
};

export default api;
