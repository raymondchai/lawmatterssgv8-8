import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  hasBackupCodes: boolean;
  lastUsed?: string;
}

export interface TwoFactorVerification {
  token: string;
  backupCode?: string;
}

class TwoFactorService {
  /**
   * Generate a new 2FA secret and QR code for setup
   */
  async setupTwoFactor(): Promise<TwoFactorSetup> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      // Call Supabase Edge Function to generate 2FA setup
      const { data, error } = await supabase.functions.invoke('two-factor-setup', {
        body: { userId: user.id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to setup 2FA');
      }

      // Generate QR code URL
      const qrCodeUrl = await QRCode.toDataURL(data.qrCodeData);

      return {
        secret: data.secret,
        qrCodeUrl,
        backupCodes: data.backupCodes
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      throw new Error('Failed to setup two-factor authentication');
    }
  }

  /**
   * Verify and enable 2FA with a token from authenticator app
   */
  async enableTwoFactor(token: string, secret: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const { error } = await supabase.functions.invoke('two-factor-enable', {
        body: { 
          userId: user.id,
          token,
          secret
        }
      });

      if (error) {
        throw new Error(error.message || 'Invalid verification code');
      }

      // Update user metadata to indicate 2FA is enabled
      await supabase.auth.updateUser({
        data: { two_factor_enabled: true }
      });

    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable two-factor authentication');
    }
  }

  /**
   * Disable 2FA for the current user
   */
  async disableTwoFactor(password: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      // Verify password before disabling 2FA
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password
      });

      if (verifyError) {
        throw new Error('Invalid password');
      }

      const { error } = await supabase.functions.invoke('two-factor-disable', {
        body: { userId: user.id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to disable 2FA');
      }

      // Update user metadata
      await supabase.auth.updateUser({
        data: { two_factor_enabled: false }
      });

    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable two-factor authentication');
    }
  }

  /**
   * Verify 2FA token during login
   */
  async verifyTwoFactor(verification: TwoFactorVerification): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('two-factor-verify', {
        body: { 
          userId: user.id,
          token: verification.token,
          backupCode: verification.backupCode
        }
      });

      if (error) {
        throw new Error(error.message || 'Invalid verification code');
      }

      return data.verified;
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      throw new Error('Failed to verify two-factor authentication');
    }
  }

  /**
   * Get 2FA status for current user
   */
  async getTwoFactorStatus(): Promise<TwoFactorStatus> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('two-factor-status', {
        body: { userId: user.id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get 2FA status');
      }

      return {
        isEnabled: data.isEnabled || false,
        hasBackupCodes: data.hasBackupCodes || false,
        lastUsed: data.lastUsed
      };
    } catch (error) {
      console.error('Error getting 2FA status:', error);
      // Return default status if error
      return {
        isEnabled: user.user_metadata?.two_factor_enabled || false,
        hasBackupCodes: false
      };
    }
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated');
    }

    try {
      const { data, error } = await supabase.functions.invoke('two-factor-backup-codes', {
        body: { userId: user.id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate backup codes');
      }

      return data.backupCodes;
    } catch (error) {
      console.error('Error generating backup codes:', error);
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Check if user has 2FA enabled (from user metadata)
   */
  isTwoFactorEnabled(user: any): boolean {
    return user?.user_metadata?.two_factor_enabled === true;
  }

  /**
   * Mock implementation for development
   */
  private mockSetup(): TwoFactorSetup {
    const secret = 'JBSWY3DPEHPK3PXP'; // Mock secret
    const qrCodeData = `otpauth://totp/LawMattersSG:user@example.com?secret=${secret}&issuer=LawMattersSG`;
    
    return {
      secret,
      qrCodeUrl: '', // Will be generated by QRCode.toDataURL
      backupCodes: [
        '12345678',
        '87654321',
        '11111111',
        '22222222',
        '33333333',
        '44444444',
        '55555555',
        '66666666'
      ]
    };
  }

  /**
   * Development mode helpers
   */
  async setupTwoFactorDev(): Promise<TwoFactorSetup> {
    if (import.meta.env.DEV) {
      const setup = this.mockSetup();
      setup.qrCodeUrl = await QRCode.toDataURL(
        `otpauth://totp/LawMattersSG:dev@example.com?secret=${setup.secret}&issuer=LawMattersSG`
      );
      return setup;
    }
    return this.setupTwoFactor();
  }

  async verifyTwoFactorDev(token: string): Promise<boolean> {
    if (import.meta.env.DEV) {
      // Accept any 6-digit code in development
      return /^\d{6}$/.test(token);
    }
    return this.verifyTwoFactor({ token });
  }
}

export const twoFactorService = new TwoFactorService();
