import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { Router } from './router/Router';

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
