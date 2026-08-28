import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('current_bd_admin_token');
    const storedUser = localStorage.getItem('current_bd_admin_user');
    if (token && storedUser) {
      try {
        setAdmin(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('current_bd_admin_token');
        localStorage.removeItem('current_bd_admin_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    let res;
    try {
      res = await api.post('/admin/login', { username, password });
    } catch (err) {
      if (err.response?.status === 404) {
        res = await api.post('/admin', { username, password });
      } else {
        throw err;
      }
    }
    if (res.data?.success && res.data?.token) {
      localStorage.setItem('current_bd_admin_token', res.data.token);
      localStorage.setItem('current_bd_admin_user', JSON.stringify(res.data.admin));
      setAdmin(res.data.admin);
      return res.data;
    }
    throw new Error(res.data?.message || 'লগইন ব্যর্থ হয়েছে');
  };

  const logout = () => {
    localStorage.removeItem('current_bd_admin_token');
    localStorage.removeItem('current_bd_admin_user');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading, isAuthenticated: Boolean(admin) }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
