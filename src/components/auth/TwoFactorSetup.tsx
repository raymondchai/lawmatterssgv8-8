import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Key,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { twoFactorService, type TwoFactorSetup, type TwoFactorStatus } from '@/lib/services/twoFactor';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface TwoFactorSetupProps {
  onSetupComplete?: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onSetupComplete }) => {
  const { user, refreshProfile } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [activeTab, setActiveTab] = useState('setup');

  useEffect(() => {
    loadTwoFactorStatus();
  }, []);

  const loadTwoFactorStatus = async () => {
    try {
      const twoFactorStatus = await twoFactorService.getTwoFactorStatus();
      setStatus(twoFactorStatus);
    } catch (error) {
      console.error('Error loading 2FA status:', error);
      toast.error('Failed to load 2FA status');
    }
  };

  const handleSetupTwoFactor = async () => {
    setIsLoading(true);
    try {
      const setupData = import.meta.env.DEV 
        ? await twoFactorService.setupTwoFactorDev()
        : await twoFactorService.setupTwoFactor();
      
      setSetup(setupData);
      setActiveTab('verify');
      toast.success('2FA setup initiated. Please scan the QR code with your authenticator app.');
    } catch (error: any) {
      console.error('Error setting up 2FA:', error);
      toast.error(error.message || 'Failed to setup 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!setup || !verificationCode) return;

    setIsVerifying(true);
    try {
      if (import.meta.env.DEV) {
        const isValid = await twoFactorService.verifyTwoFactorDev(verificationCode);
        if (!isValid) {
          throw new Error('Invalid verification code');
        }
      } else {
        await twoFactorService.enableTwoFactor(verificationCode, setup.secret);
      }

      await refreshProfile();
      await loadTwoFactorStatus();
      setShowBackupCodes(true);
      setActiveTab('backup');
      toast.success('Two-factor authentication enabled successfully!');
      onSetupComplete?.();
    } catch (error: any) {
      console.error('Error verifying 2FA:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!disablePassword) return;

    setIsDisabling(true);
    try {
      await twoFactorService.disableTwoFactor(disablePassword);
      await refreshProfile();
      await loadTwoFactorStatus();
      setDisablePassword('');
      toast.success('Two-factor authentication disabled');
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      const backupCodes = await twoFactorService.generateBackupCodes();
      setSetup(prev => prev ? { ...prev, backupCodes } : null);
      toast.success('New backup codes generated');
    } catch (error: any) {
      console.error('Error generating backup codes:', error);
      toast.error(error.message || 'Failed to generate backup codes');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadBackupCodes = () => {
    if (!setup?.backupCodes) return;

    const content = `LawMattersSG - Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\nUser: ${user?.email}\n\nBackup Codes:\n${setup.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nImportant:\n- Store these codes in a safe place\n- Each code can only be used once\n- Use these codes if you lose access to your authenticator app`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lawmatterssg-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!status) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Two-Factor Authentication</CardTitle>
          </div>
          <Badge variant={status.isEnabled ? 'default' : 'secondary'}>
            {status.isEnabled ? (
              <>
                <ShieldCheck className="h-3 w-3 mr-1" />
                Enabled
              </>
            ) : (
              <>
                <ShieldX className="h-3 w-3 mr-1" />
                Disabled
              </>
            )}
          </Badge>
        </div>
        <CardDescription>
          Add an extra layer of security to your account with two-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status.isEnabled ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is enabled for your account.
                {status.lastUsed && ` Last used: ${new Date(status.lastUsed).toLocaleString()}`}
              </AlertDescription>
            </Alert>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleGenerateBackupCodes}
                className="flex-1"
              >
                <Key className="h-4 w-4 mr-2" />
                Generate New Backup Codes
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <ShieldX className="h-4 w-4 mr-2" />
                    Disable 2FA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      This will remove the extra security layer from your account. 
                      Please enter your password to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="disable-password">Password</Label>
                      <Input
                        id="disable-password"
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDisableTwoFactor}
                      disabled={!disablePassword || isDisabling}
                    >
                      {isDisabling ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ShieldX className="h-4 w-4 mr-2" />
                      )}
                      Disable 2FA
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="verify" disabled={!setup}>Verify</TabsTrigger>
              <TabsTrigger value="backup" disabled={!showBackupCodes}>Backup Codes</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is not enabled. Enable it to add an extra layer of security to your account.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What you'll need:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• An authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>• Your smartphone or tablet</li>
                    <li>• A few minutes to complete the setup</li>
                  </ul>
                </div>

                <Button
                  onClick={handleSetupTwoFactor}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Smartphone className="h-4 w-4 mr-2" />
                  )}
                  Setup Two-Factor Authentication
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="verify" className="space-y-4">
              {setup && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-medium mb-2">Scan QR Code</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Scan this QR code with your authenticator app
                    </p>
                    <div className="flex justify-center mb-4">
                      <img
                        src={setup.qrCodeUrl}
                        alt="2FA QR Code"
                        className="border rounded-lg"
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      <p>Can't scan? Enter this code manually:</p>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {setup.secret}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(setup.secret)}
                        className="ml-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  <Button
                    onClick={handleVerifyAndEnable}
                    disabled={verificationCode.length !== 6 || isVerifying}
                    className="w-full"
                  >
                    {isVerifying ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Verify and Enable 2FA
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="backup" className="space-y-4">
              {setup?.backupCodes && (
                <div className="space-y-4">
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertDescription>
                      Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                      {setup.backupCodes.map((code, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <span>{code}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={downloadBackupCodes}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Codes
                    </Button>
                    <Button
                      onClick={() => copyToClipboard(setup.backupCodes.join('\n'))}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
