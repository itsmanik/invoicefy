import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('business');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Business APIs
export const businessAPI = {
  getProfile: () => api.get('/businesses/profile'),
  updateProfile: (data) => api.put('/businesses/profile', data),
  uploadLogo: (formData) => api.post('/businesses/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Clients APIs
export const clientsAPI = {
  create: (clientData) => api.post('/clients/create', clientData),
  getAll: () => api.get('/clients/all'),
  getById: (id) => api.get(`/clients/${id}`),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

// Invoices APIs
export const invoicesAPI = {
  create: (invoiceData) => api.post('/invoices/create', invoiceData),
  getAll: () => api.get('/invoices/all'),
  getById: (id) => api.get(`/invoices/${id}`),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, { status }),
  downloadPDF: (id) => api.get(`/invoices/download/${id}`, {
    responseType: 'blob',
  }),
};

// Analytics APIs
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getRevenueData: () => api.get('/analytics/revenue'),
  getInvoiceStats: () => api.get('/analytics/invoices'),
};

export default api;