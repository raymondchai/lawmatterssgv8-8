import React from 'react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { UnauthenticatedRoute } from '@/components/auth/ProtectedRoute';

const ForgotPassword: React.FC = () => {
  return (
    <UnauthenticatedRoute>
      <ForgotPasswordForm />
    </UnauthenticatedRoute>
  );
};

export default ForgotPassword;
