import React, { createContext, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ksba_auth') || 'null');
    } catch {
      return null;
    }
  });

  const loginStaff = async (email, password) => {
    const { data } = await api.post('/staff/auth/login', { email, password });
    localStorage.setItem('ksba_token', data.token);
    const payload = { kind: 'staff', user: data.user };
    localStorage.setItem('ksba_auth', JSON.stringify(payload));
    setAuth(payload);
    return payload;
  };

  const loginCitizen = async (body) => {
    const { data } = await api.post('/public/auth/verify-otp', body);
    localStorage.setItem('ksba_token', data.token);
    const payload = { kind: 'citizen', citizen: data.citizen };
    localStorage.setItem('ksba_auth', JSON.stringify(payload));
    setAuth(payload);
    return payload;
  };

  const logout = () => {
    localStorage.removeItem('ksba_token');
    localStorage.removeItem('ksba_auth');
    setAuth(null);
  };

  const value = useMemo(
    () => ({
      auth,
      user: auth?.user,
      citizen: auth?.citizen,
      kind: auth?.kind,
      loginStaff,
      loginCitizen,
      logout,
    }),
    [auth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
