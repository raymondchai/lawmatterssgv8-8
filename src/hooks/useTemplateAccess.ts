import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  templateAccessControlService, 
  type AccessControlResult, 
  type TemplateAccessLevel,
  type UsageStats,
  type UserSubscription
} from '@/lib/services/templateAccessControl';

export interface UseTemplateAccessResult {
  // Access checks
  canViewTemplate: boolean;
  canCustomizeTemplate: boolean;
  canDownloadPDF: boolean;
  canDownloadDOCX: boolean;
  canDownloadHTML: boolean;
  
  // Access details
  accessResult: AccessControlResult | null;
  subscription: UserSubscription | null;
  usageStats: UsageStats | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  checkAccess: () => Promise<void>;
  recordUsage: (action: 'view' | 'customize' | 'download') => Promise<void>;
}

export function useTemplateAccess(
  templateAccessLevel: TemplateAccessLevel,
  templateId?: string
): UseTemplateAccessResult {
  const { user } = useAuth();
  
  const [accessResult, setAccessResult] = useState<AccessControlResult | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check template access
      const result = await templateAccessControlService.checkTemplateAccess(
        user?.id || null,
        templateAccessLevel,
        templateId
      );
      setAccessResult(result);

      // Load subscription and usage data if user is authenticated
      if (user) {
        try {
          const [subscriptionData, usageData] = await Promise.all([
            templateAccessControlService.getUserSubscription(user.id),
            templateAccessControlService.getUserUsageStats(user.id)
          ]);
          
          setSubscription(subscriptionData);
          setUsageStats(usageData);
        } catch (err) {
          console.error('Error loading user data:', err);
          // Don't set error here as template access might still work
        }
      }

    } catch (err) {
      console.error('Error checking template access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check access');
      setAccessResult({ hasAccess: false, reason: 'Error checking access' });
    } finally {
      setLoading(false);
    }
  };

  const recordUsage = async (action: 'view' | 'customize' | 'download') => {
    if (!user) return;
    
    try {
      await templateAccessControlService.recordTemplateUsage(user.id, action);
      
      // Refresh usage stats after recording
      const updatedUsage = await templateAccessControlService.getUserUsageStats(user.id);
      setUsageStats(updatedUsage);
    } catch (err) {
      console.error('Error recording usage:', err);
    }
  };

  // Check access when dependencies change
  useEffect(() => {
    checkAccess();
  }, [user?.id, templateAccessLevel, templateId]);

  // Derive access permissions from access result
  const canViewTemplate = accessResult?.hasAccess ?? false;
  
  const canCustomizeTemplate = canViewTemplate; // Same as view for now
  
  const canDownloadPDF = canViewTemplate; // PDF is always available if template is accessible
  
  const canDownloadDOCX = canViewTemplate && (
    !user || // Anonymous users can't download DOCX
    subscription?.tier === 'premium' || 
    subscription?.tier === 'pro' || 
    subscription?.tier === 'enterprise'
  );
  
  const canDownloadHTML = canDownloadDOCX; // Same requirements as DOCX

  return {
    // Access checks
    canViewTemplate,
    canCustomizeTemplate,
    canDownloadPDF,
    canDownloadDOCX,
    canDownloadHTML,
    
    // Access details
    accessResult,
    subscription,
    usageStats,
    
    // Loading states
    loading,
    error,
    
    // Actions
    checkAccess,
    recordUsage
  };
}

export interface UseTemplateDownloadAccessResult {
  canDownload: boolean;
  accessResult: AccessControlResult | null;
  loading: boolean;
  error: string | null;
  checkDownloadAccess: () => Promise<void>;
}

export function useTemplateDownloadAccess(
  templateAccessLevel: TemplateAccessLevel,
  format: 'pdf' | 'docx' | 'html'
): UseTemplateDownloadAccessResult {
  const { user } = useAuth();
  
  const [accessResult, setAccessResult] = useState<AccessControlResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkDownloadAccess = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await templateAccessControlService.checkDownloadAccess(
        user?.id || null,
        templateAccessLevel,
        format
      );
      
      setAccessResult(result);
    } catch (err) {
      console.error('Error checking download access:', err);
      setError(err instanceof Error ? err.message : 'Failed to check download access');
      setAccessResult({ hasAccess: false, reason: 'Error checking download access' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkDownloadAccess();
  }, [user?.id, templateAccessLevel, format]);

  return {
    canDownload: accessResult?.hasAccess ?? false,
    accessResult,
    loading,
    error,
    checkDownloadAccess
  };
}

export interface UseSubscriptionResult {
  subscription: UserSubscription | null;
  usageStats: UsageStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!user) {
      setSubscription(null);
      setUsageStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [subscriptionData, usageData] = await Promise.all([
        templateAccessControlService.getUserSubscription(user.id),
        templateAccessControlService.getUserUsageStats(user.id)
      ]);
      
      setSubscription(subscriptionData);
      setUsageStats(usageData);
    } catch (err) {
      console.error('Error loading subscription data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  return {
    subscription,
    usageStats,
    loading,
    error,
    refresh
  };
}
