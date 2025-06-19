import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  Smartphone,
  Key,
  ArrowLeft,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { twoFactorService } from '@/lib/services/twoFactor';
import { toast } from '@/components/ui/sonner';

interface TwoFactorVerificationProps {
  onVerificationSuccess: () => void;
  onBack?: () => void;
  userEmail?: string;
}

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  onVerificationSuccess,
  onBack,
  userEmail
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleVerification = async () => {
    if (!verificationCode && !backupCode) {
      setError('Please enter a verification code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      let isValid = false;

      if (import.meta.env.DEV) {
        // In development, accept any 6-digit code or 8-digit backup code
        if (useBackupCode) {
          isValid = /^\d{8}$/.test(backupCode);
        } else {
          isValid = /^\d{6}$/.test(verificationCode);
        }
      } else {
        isValid = await twoFactorService.verifyTwoFactor({
          token: verificationCode,
          backupCode: useBackupCode ? backupCode : undefined
        });
      }

      if (isValid) {
        toast.success('Two-factor authentication verified successfully');
        onVerificationSuccess();
      } else {
        throw new Error('Invalid verification code');
      }
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      setError(error.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(cleanValue);
    setError(null);
  };

  const handleBackupCodeChange = (value: string) => {
    // Only allow digits and limit to 8 characters for backup codes
    const cleanValue = value.replace(/\D/g, '').slice(0, 8);
    setBackupCode(cleanValue);
    setError(null);
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setVerificationCode('');
    setBackupCode('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-center">
            {useBackupCode 
              ? 'Enter one of your backup codes to continue'
              : 'Enter the verification code from your authenticator app'
            }
          </CardDescription>
          {userEmail && (
            <p className="text-sm text-gray-500 text-center">
              Signing in as {userEmail}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {!useBackupCode ? (
              <div>
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="backup-code">Backup Code</Label>
                <Input
                  id="backup-code"
                  type="text"
                  value={backupCode}
                  onChange={(e) => handleBackupCodeChange(e.target.value)}
                  placeholder="12345678"
                  maxLength={8}
                  className="text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Enter one of your 8-digit backup codes
                </p>
              </div>
            )}

            <Button
              onClick={handleVerification}
              disabled={
                isVerifying || 
                (!useBackupCode && verificationCode.length !== 6) ||
                (useBackupCode && backupCode.length !== 8)
              }
              className="w-full"
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Verify and Continue
            </Button>

            <Separator />

            <div className="space-y-2">
              <Button
                variant="ghost"
                onClick={toggleBackupCode}
                className="w-full text-sm"
              >
                {useBackupCode ? (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Use authenticator app instead
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Use backup code instead
                  </>
                )}
              </Button>

              {onBack && (
                <Button
                  variant="outline"
                  onClick={onBack}
                  className="w-full text-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to login
                </Button>
              )}
            </div>
          </div>

          {/* Help Dialog */}
          <div className="text-center">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" className="text-sm">
                  Need help?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Two-Factor Authentication Help</DialogTitle>
                  <DialogDescription>
                    Having trouble with your verification code?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Authenticator App Issues:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Make sure your device's time is synchronized</li>
                      <li>• Check that you're using the correct account in your app</li>
                      <li>• Try refreshing the code in your authenticator app</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Lost Access?</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Use one of your backup codes</li>
                      <li>• Contact support if you've lost both your device and backup codes</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Backup Codes:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Each backup code can only be used once</li>
                      <li>• Generate new backup codes after using them</li>
                      <li>• Store them in a safe place</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface TwoFactorPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationSuccess: () => void;
  userEmail?: string;
}

export const TwoFactorPrompt: React.FC<TwoFactorPromptProps> = ({
  isOpen,
  onClose,
  onVerificationSuccess,
  userEmail
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Two-Factor Authentication Required
          </DialogTitle>
          <DialogDescription>
            Please enter your verification code to continue.
          </DialogDescription>
        </DialogHeader>
        <TwoFactorVerification
          onVerificationSuccess={() => {
            onVerificationSuccess();
            onClose();
          }}
          onBack={onClose}
          userEmail={userEmail}
        />
      </DialogContent>
    </Dialog>
  );
};
