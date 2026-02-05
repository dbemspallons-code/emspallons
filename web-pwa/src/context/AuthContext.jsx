import React, { createContext, useContext } from 'react';

const AuthContext = createContext({
  user: null,
  loading: true,
  refreshUser: () => {},
  logout: () => Promise.resolve(),
});

export function AuthProvider({ value, children }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}


