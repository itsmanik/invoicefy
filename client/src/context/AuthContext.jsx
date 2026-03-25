import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, businessAPI, getAssetUrl } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

const normalizeBusiness = (business) => {
  if (!business) return business;

  const rawLogoUrl = business.logoUrl || business.logoPath || null;

  return {
    ...business,
    logoUrl: rawLogoUrl,
    logoAssetUrl: getAssetUrl(rawLogoUrl),
    customTemplateAssetUrl: getAssetUrl(business.customTemplateUrl),
  };
};

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
        const normalizedBusiness = normalizeBusiness(JSON.parse(storedBusiness));
        setBusiness(normalizedBusiness);
        localStorage.setItem('business', JSON.stringify(normalizedBusiness));
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user, business } = response.data;
      const normalizedBusiness = normalizeBusiness(business);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('business', JSON.stringify(normalizedBusiness));

      setToken(token);
      setUser(user);
      setBusiness(normalizedBusiness);

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
      const normalizedBusiness = normalizeBusiness(business);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('business', JSON.stringify(normalizedBusiness));

      setToken(token);
      setUser(user);
      setBusiness(normalizedBusiness);

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
      const updatedBusiness = normalizeBusiness(response.data.business || response.data);
      setBusiness(updatedBusiness);
      localStorage.setItem('business', JSON.stringify(updatedBusiness));
      toast.success('Business updated successfully');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update business');
      return { success: false };
    }
  };

  const uploadLogo = async (formData) => {
    try {
      const response = await businessAPI.uploadLogo(formData);
      const updatedBusiness = normalizeBusiness({ ...business, logoUrl: response.data.logoUrl });
      setBusiness(updatedBusiness);
      localStorage.setItem('business', JSON.stringify(updatedBusiness));
      toast.success('Logo uploaded successfully');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload logo');
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
