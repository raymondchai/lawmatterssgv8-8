import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { UnauthenticatedRoute } from '@/components/auth/ProtectedRoute';

const Login: React.FC = () => {
  return (
    <UnauthenticatedRoute>
      <LoginForm />
    </UnauthenticatedRoute>
  );
};

export default Login;
