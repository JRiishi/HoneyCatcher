import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://honeycatcher.onrender.com/api';
const API_KEY = process.env.EXPO_PUBLIC_API_SECRET_KEY || 'unsafe-secret-key-change-me';

const TOKEN_KEY = 'hb_access_token';
const REFRESH_KEY = 'hb_refresh_token';

// Token helpers using AsyncStorage (async)
export const getAccessToken = async () => AsyncStorage.getItem(TOKEN_KEY);
export const getRefreshToken = async () => AsyncStorage.getItem(REFRESH_KEY);
export const setTokens = async (access, refresh) => {
  await AsyncStorage.setItem(TOKEN_KEY, access);
  await AsyncStorage.setItem(REFRESH_KEY, refresh);
};
export const clearTokens = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_KEY);
};
export const isAuthenticated = async () => !!(await getAccessToken());

// Fetch wrapper with auth headers
const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : { 'x-api-key': API_KEY }),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers, timeout: 15000 });

  if (response.status === 401 && token) {
    // Try refresh
    const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const refreshData = await refreshRes.json();
        await setTokens(refreshData.access_token, refreshData.refresh_token);
        // Retry original request
        headers.Authorization = `Bearer ${refreshData.access_token}`;
        const retryRes = await fetch(url, { ...options, headers });
        return retryRes.json();
      } catch {
        await clearTokens();
        throw new Error('Session expired');
      }
    }
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
};

const api = {
  get: (endpoint, options = {}) => {
    const params = options.params ? '?' + new URLSearchParams(options.params).toString() : '';
    return apiFetch(endpoint + params, { method: 'GET', ...options });
  },
  post: (endpoint, data, options = {}) =>
    apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data), ...options }),
  put: (endpoint, data, options = {}) =>
    apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(data), ...options }),
  delete: (endpoint, options = {}) =>
    apiFetch(endpoint, { method: 'DELETE', ...options }),
  postForm: async (endpoint, formData) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-api-key': API_KEY };
    // Do NOT set Content-Type for FormData - let fetch set it with boundary
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
};

// Auth API
export const authAPI = {
  register: (username, password, displayName) =>
    api.post('/auth/register', { username, password, display_name: displayName }),
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.access_token) {
      await setTokens(res.access_token, res.refresh_token);
    }
    return res;
  },
  logout: async () => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);
    const res = await api.post('/auth/logout', { refresh_token: refreshToken });
    await clearTokens();
    return res;
  },
  me: () => api.get('/auth/me'),
};

// Session helpers
export const fetchSessions = async (filters = {}) => {
  try {
    const params = {};
    if (filters.voiceEnabled != null) params.voiceEnabled = filters.voiceEnabled;
    if (filters.language) params.language = filters.language;
    if (filters.minScamScore) params.minScamScore = filters.minScamScore;
    if (filters.voiceMode) params.voiceMode = filters.voiceMode;
    const res = await api.get('/sessions', { params });
    return res;
  } catch (e) {
    console.warn('fetchSessions error:', e.message);
    return [];
  }
};

export const fetchSession = async (sessionId) => {
  try {
    const res = await api.get(`/sessions/${sessionId}`);
    return res;
  } catch (e) {
    console.warn('fetchSession error:', e.message);
    return null;
  }
};

export const simulateScamMessage = async (sessionId, text) => {
  try {
    const res = await api.post('/message', {
      sessionId,
      message: {
        sender: 'scammer',
        text,
        timestamp: Date.now(),
      },
    });
    return res;
  } catch (e) {
    console.warn('simulateScamMessage error:', e.message);
    return null;
  }
};

export const extractSmsEvidence = async (sessionId, phoneNumber, messages) => {
  try {
    const res = await api.post(`/session/${sessionId}/sms`, {
      session_id: sessionId,
      phone_number: phoneNumber,
      messages: messages
    });
    return res;
  } catch (e) {
    console.warn('extractSmsEvidence error:', e.message);
    return null;
  }
};

export default api;
