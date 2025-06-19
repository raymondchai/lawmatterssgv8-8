import React from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { UnauthenticatedRoute } from '@/components/auth/ProtectedRoute';

const Register: React.FC = () => {
  return (
    <UnauthenticatedRoute>
      <RegisterForm />
    </UnauthenticatedRoute>
  );
};

export default Register;
