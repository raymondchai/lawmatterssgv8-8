import { useState, useEffect, useCallback } from 'react';
import { twoFactorAuthApi, type TwoFactorAuthSettings, type TwoFactorSetupData } from '@/lib/api/twoFactorAuth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface UseTwoFactorAuthReturn {
  settings: TwoFactorAuthSettings | null;
  loading: boolean;
  error: string | null;
  isEnabled: boolean;
  setupTOTP: (userEmail: string) => Promise<TwoFactorSetupData | null>;
  verifyAndEnable: (secret: string, code: string) => Promise<boolean>;
  setupSMS: (phoneNumber: string) => Promise<boolean>;
  verifyCode: (code: string, method?: 'totp' | 'sms' | 'backup') => Promise<boolean>;
  disable: () => Promise<boolean>;
  getBackupCodes: () => Promise<string[]>;
  regenerateBackupCodes: () => Promise<string[]>;
  refetch: () => Promise<void>;
}

export const useTwoFactorAuth = (): UseTwoFactorAuthReturn => {
  const [settings, setSettings] = useState<TwoFactorAuthSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch 2FA settings
  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await twoFactorAuthApi.getSettings();
      setSettings(data);
    } catch (err: any) {
      console.error('Error fetching 2FA settings:', err);
      setError(err.message || 'Failed to load 2FA settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Setup TOTP 2FA
  const setupTOTP = useCallback(async (userEmail: string): Promise<TwoFactorSetupData | null> => {
    try {
      setError(null);
      const setupData = await twoFactorAuthApi.setupTOTP(userEmail);
      toast.success('TOTP setup initiated. Scan the QR code with your authenticator app.');
      return setupData;
    } catch (err: any) {
      console.error('Error setting up TOTP:', err);
      setError(err.message || 'Failed to setup TOTP');
      toast.error(err.message || 'Failed to setup TOTP');
      return null;
    }
  }, []);

  // Verify TOTP code and enable 2FA
  const verifyAndEnable = useCallback(async (secret: string, code: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await twoFactorAuthApi.verifyAndEnableTOTP(secret, code);
      
      if (success) {
        await fetchSettings(); // Refresh settings
        toast.success('Two-factor authentication enabled successfully!');
        return true;
      } else {
        toast.error('Invalid verification code. Please try again.');
        return false;
      }
    } catch (err: any) {
      console.error('Error verifying TOTP:', err);
      setError(err.message || 'Failed to verify code');
      toast.error(err.message || 'Failed to verify code');
      return false;
    }
  }, [fetchSettings]);

  // Setup SMS 2FA
  const setupSMS = useCallback(async (phoneNumber: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await twoFactorAuthApi.setupSMS(phoneNumber);
      
      if (success) {
        await fetchSettings(); // Refresh settings
        toast.success('SMS two-factor authentication enabled successfully!');
        return true;
      } else {
        toast.error('Failed to setup SMS 2FA');
        return false;
      }
    } catch (err: any) {
      console.error('Error setting up SMS 2FA:', err);
      setError(err.message || 'Failed to setup SMS 2FA');
      toast.error(err.message || 'Failed to setup SMS 2FA');
      return false;
    }
  }, [fetchSettings]);

  // Verify 2FA code
  const verifyCode = useCallback(async (
    code: string, 
    method: 'totp' | 'sms' | 'backup' = 'totp'
  ): Promise<boolean> => {
    try {
      setError(null);
      const success = await twoFactorAuthApi.verifyCode({ code, method });
      
      if (success) {
        if (method === 'backup') {
          toast.success('Backup code verified successfully!');
        } else {
          toast.success('Code verified successfully!');
        }
        return true;
      } else {
        toast.error('Invalid verification code. Please try again.');
        return false;
      }
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Failed to verify code');
      toast.error(err.message || 'Failed to verify code');
      return false;
    }
  }, []);

  // Disable 2FA
  const disable = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const success = await twoFactorAuthApi.disable();
      
      if (success) {
        await fetchSettings(); // Refresh settings
        toast.success('Two-factor authentication disabled successfully!');
        return true;
      } else {
        toast.error('Failed to disable 2FA');
        return false;
      }
    } catch (err: any) {
      console.error('Error disabling 2FA:', err);
      setError(err.message || 'Failed to disable 2FA');
      toast.error(err.message || 'Failed to disable 2FA');
      return false;
    }
  }, [fetchSettings]);

  // Get backup codes
  const getBackupCodes = useCallback(async (): Promise<string[]> => {
    try {
      setError(null);
      const codes = await twoFactorAuthApi.getBackupCodes();
      toast.success('Backup codes generated successfully!');
      return codes;
    } catch (err: any) {
      console.error('Error getting backup codes:', err);
      setError(err.message || 'Failed to get backup codes');
      toast.error(err.message || 'Failed to get backup codes');
      return [];
    }
  }, []);

  // Regenerate backup codes
  const regenerateBackupCodes = useCallback(async (): Promise<string[]> => {
    try {
      setError(null);
      const codes = await twoFactorAuthApi.regenerateBackupCodes();
      toast.success('New backup codes generated successfully! Old codes are now invalid.');
      return codes;
    } catch (err: any) {
      console.error('Error regenerating backup codes:', err);
      setError(err.message || 'Failed to regenerate backup codes');
      toast.error(err.message || 'Failed to regenerate backup codes');
      return [];
    }
  }, []);

  return {
    settings,
    loading,
    error,
    isEnabled: settings?.enabled || false,
    setupTOTP,
    verifyAndEnable,
    setupSMS,
    verifyCode,
    disable,
    getBackupCodes,
    regenerateBackupCodes,
    refetch: fetchSettings
  };
};

// Hook for checking if 2FA is required during login
export const useTwoFactorRequired = (userId?: string) => {
  const [isRequired, setIsRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRequirement = async () => {
      if (!userId) {
        setIsRequired(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const required = await twoFactorAuthApi.isRequired(userId);
        setIsRequired(required);
      } catch (error) {
        console.error('Error checking 2FA requirement:', error);
        setIsRequired(false);
      } finally {
        setLoading(false);
      }
    };

    checkRequirement();
  }, [userId]);

  return { isRequired, loading };
};
