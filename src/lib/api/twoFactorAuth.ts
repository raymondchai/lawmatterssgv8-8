import { supabase } from '@/lib/supabase';
import * as speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface TwoFactorAuthSettings {
  id: string;
  user_id: string;
  enabled: boolean;
  method: 'totp' | 'sms';
  phone_number?: string;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface VerifyCodeData {
  code: string;
  method?: 'totp' | 'sms' | 'backup';
}

export interface TwoFactorAttempt {
  id: string;
  user_id: string;
  method: 'totp' | 'sms' | 'backup';
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const twoFactorAuthApi = {
  // Get current 2FA settings for the authenticated user
  async getSettings(): Promise<TwoFactorAuthSettings | null> {
    const { data, error } = await supabase
      .from('two_factor_auth')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching 2FA settings:', error);
      throw new Error('Failed to fetch 2FA settings');
    }

    return data;
  },

  // Setup TOTP (Time-based One-Time Password) 2FA
  async setupTOTP(userEmail: string): Promise<TwoFactorSetupData> {
    try {
      // Generate a secret key
      const secret = speakeasy.generateSecret({
        name: `LawMattersSG (${userEmail})`,
        issuer: 'LawMattersSG',
        length: 32
      });

      // Generate QR code URL
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const { data: backupCodes, error: backupError } = await supabase
        .rpc('generate_backup_codes', {
          target_user_id: (await supabase.auth.getUser()).data.user?.id,
          num_codes: 10
        });

      if (backupError) {
        console.error('Error generating backup codes:', backupError);
        throw new Error('Failed to generate backup codes');
      }

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes: backupCodes || [],
        manualEntryKey: secret.base32
      };
    } catch (error) {
      console.error('Error setting up TOTP:', error);
      throw new Error('Failed to setup TOTP authentication');
    }
  },

  // Verify TOTP code and enable 2FA
  async verifyAndEnableTOTP(secret: string, code: string): Promise<boolean> {
    try {
      // Verify the TOTP code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time steps of tolerance
      });

      if (!verified) {
        return false;
      }

      // Enable 2FA in the database
      const { error } = await supabase.rpc('enable_two_factor_auth', {
        target_user_id: (await supabase.auth.getUser()).data.user?.id,
        auth_method: 'totp',
        secret_key: secret
      });

      if (error) {
        console.error('Error enabling 2FA:', error);
        throw new Error('Failed to enable 2FA');
      }

      return true;
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      throw new Error('Failed to verify TOTP code');
    }
  },

  // Setup SMS 2FA
  async setupSMS(phoneNumber: string): Promise<boolean> {
    try {
      // In a real implementation, you would send an SMS verification code here
      // For now, we'll just enable SMS 2FA
      const { error } = await supabase.rpc('enable_two_factor_auth', {
        target_user_id: (await supabase.auth.getUser()).data.user?.id,
        auth_method: 'sms',
        phone: phoneNumber
      });

      if (error) {
        console.error('Error setting up SMS 2FA:', error);
        throw new Error('Failed to setup SMS 2FA');
      }

      return true;
    } catch (error) {
      console.error('Error setting up SMS 2FA:', error);
      throw new Error('Failed to setup SMS 2FA');
    }
  },

  // Verify 2FA code during login
  async verifyCode(data: VerifyCodeData): Promise<boolean> {
    try {
      const { code, method = 'totp' } = data;
      const user = (await supabase.auth.getUser()).data.user;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (method === 'totp') {
        // Get the user's TOTP secret
        const { data: authSettings, error } = await supabase
          .from('two_factor_auth')
          .select('secret')
          .eq('user_id', user.id)
          .eq('enabled', true)
          .single();

        if (error || !authSettings?.secret) {
          throw new Error('2FA not properly configured');
        }

        // Verify TOTP code
        const verified = speakeasy.totp.verify({
          secret: authSettings.secret,
          encoding: 'base32',
          token: code,
          window: 2
        });

        if (verified) {
          // Update last used timestamp
          await supabase
            .from('two_factor_auth')
            .update({ last_used_at: new Date().toISOString() })
            .eq('user_id', user.id);
        }

        return verified;
      } else if (method === 'backup') {
        // Verify backup code using database function
        const { data: verified, error } = await supabase
          .rpc('verify_two_factor_code', {
            target_user_id: user.id,
            code,
            method_type: 'backup'
          });

        if (error) {
          console.error('Error verifying backup code:', error);
          return false;
        }

        return verified || false;
      } else if (method === 'sms') {
        // In a real implementation, verify SMS code here
        // For now, return false as SMS verification needs external service
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      throw new Error('Failed to verify 2FA code');
    }
  },

  // Disable 2FA
  async disable(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('disable_two_factor_auth', {
        target_user_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) {
        console.error('Error disabling 2FA:', error);
        throw new Error('Failed to disable 2FA');
      }

      return true;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  },

  // Get backup codes
  async getBackupCodes(): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', {
        target_user_id: (await supabase.auth.getUser()).data.user?.id,
        num_codes: 10
      });

      if (error) {
        console.error('Error getting backup codes:', error);
        throw new Error('Failed to get backup codes');
      }

      return data || [];
    } catch (error) {
      console.error('Error getting backup codes:', error);
      throw new Error('Failed to get backup codes');
    }
  },

  // Get 2FA attempts history
  async getAttempts(limit: number = 10): Promise<TwoFactorAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('two_factor_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching 2FA attempts:', error);
        throw new Error('Failed to fetch 2FA attempts');
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching 2FA attempts:', error);
      throw new Error('Failed to fetch 2FA attempts');
    }
  },

  // Check if 2FA is required for user
  async isRequired(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking 2FA requirement:', error);
        return false;
      }

      return data?.two_factor_enabled || false;
    } catch (error) {
      console.error('Error checking 2FA requirement:', error);
      return false;
    }
  },

  // Generate new backup codes (invalidates old ones)
  async regenerateBackupCodes(): Promise<string[]> {
    try {
      const { data, error } = await supabase.rpc('generate_backup_codes', {
        target_user_id: (await supabase.auth.getUser()).data.user?.id,
        num_codes: 10
      });

      if (error) {
        console.error('Error regenerating backup codes:', error);
        throw new Error('Failed to regenerate backup codes');
      }

      return data || [];
    } catch (error) {
      console.error('Error regenerating backup codes:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }
};
