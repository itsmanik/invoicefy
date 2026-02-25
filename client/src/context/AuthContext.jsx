import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, businessAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('user');
      const storedBusiness = localStorage.getItem('business');

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedBusiness) {
        setBusiness(JSON.parse(storedBusiness));
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user, business } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('business', JSON.stringify(business));

      setToken(token);
      setUser(user);
      setBusiness(business);

      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { token, user, business } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('business', JSON.stringify(business));

      setToken(token);
      setUser(user);
      setBusiness(business);

      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
      return { success: false, error: error.response?.data?.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('business');
    setToken(null);
    setUser(null);
    setBusiness(null);
    toast.success('Logged out successfully');
  };

  const updateBusiness = async (businessData) => {
    try {
      const response = await businessAPI.updateProfile(businessData);
      setBusiness(response.data);
      localStorage.setItem('business', JSON.stringify(response.data));
      toast.success('Business updated successfully');
      return { success: true };
    } catch (error) {
      toast.error('Failed to update business');
      return { success: false };
    }
  };

  const uploadLogo = async (formData) => {
    try {
      const response = await businessAPI.uploadLogo(formData);
      setBusiness({ ...business, logoUrl: response.data.logoUrl });
      localStorage.setItem('business', JSON.stringify({ ...business, logoUrl: response.data.logoUrl }));
      toast.success('Logo uploaded successfully');
      return { success: true };
    } catch (error) {
      toast.error('Failed to upload logo');
      return { success: false };
    }
  };

  const value = {
    user,
    business,
    token,
    login,
    register,
    logout,
    updateBusiness,
    uploadLogo,
    loading,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};