import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usageTrackingService, type ResourceType, type UsageLimit, type UsageStats } from '@/lib/services/usageTracking';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to check usage limits for a specific resource type
 */
export function useUsageLimit(resourceType: ResourceType) {
  return useQuery({
    queryKey: ['usage-limit', resourceType],
    queryFn: () => usageTrackingService.checkUsageLimit(resourceType),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get current usage statistics
 */
export function useUsageStats() {
  return useQuery({
    queryKey: ['usage-stats'],
    queryFn: () => usageTrackingService.getUsageStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get user's subscription limits
 */
export function useUserLimits() {
  return useQuery({
    queryKey: ['user-limits'],
    queryFn: () => usageTrackingService.getUserLimits(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get billing alerts
 */
export function useBillingAlerts(unreadOnly: boolean = false) {
  return useQuery({
    queryKey: ['billing-alerts', unreadOnly],
    queryFn: () => usageTrackingService.getBillingAlerts(unreadOnly),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to increment usage with optimistic updates
 */
export function useIncrementUsage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      resourceType, 
      resourceId, 
      metadata 
    }: { 
      resourceType: ResourceType; 
      resourceId?: string; 
      metadata?: Record<string, any> 
    }) => usageTrackingService.incrementUsage(resourceType, resourceId, metadata),
    
    onSuccess: (_, variables) => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['usage-limit', variables.resourceType] });
      queryClient.invalidateQueries({ queryKey: ['usage-stats'] });
      queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
    },
    
    onError: (error) => {
      toast({
        title: 'Usage Tracking Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to check and increment usage in one operation
 */
export function useCheckAndIncrementUsage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      resourceType, 
      resourceId, 
      metadata 
    }: { 
      resourceType: ResourceType; 
      resourceId?: string; 
      metadata?: Record<string, any> 
    }) => usageTrackingService.checkAndIncrementUsage(resourceType, resourceId, metadata),
    
    onSuccess: (result, variables) => {
      if (result.allowed) {
        // Invalidate related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['usage-limit', variables.resourceType] });
        queryClient.invalidateQueries({ queryKey: ['usage-stats'] });
        queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
      } else {
        // Show usage limit error
        toast({
          title: 'Usage Limit Reached',
          description: `You have reached your monthly limit for ${variables.resourceType}. Please upgrade your plan to continue.`,
          variant: 'destructive',
        });
      }
    },
    
    onError: (error) => {
      toast({
        title: 'Usage Check Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to mark billing alert as read
 */
export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => usageTrackingService.markAlertAsRead(alertId),
    onSuccess: () => {
      // Invalidate billing alerts queries
      queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
    },
  });
}

/**
 * Utility hook to check if specific features are available based on usage limits
 */
export function useFeatureAvailability() {
  const { data: aiLimit } = useUsageLimit('ai_query');
  const { data: documentLimit } = useUsageLimit('document_upload');
  const { data: customDocLimit } = useUsageLimit('custom_document');

  return {
    canUseAI: aiLimit?.allowed ?? false,
    canUploadDocuments: documentLimit?.allowed ?? false,
    canDownloadCustomDocuments: customDocLimit?.allowed ?? false,
    
    // Usage information
    aiUsage: aiLimit,
    documentUsage: documentLimit,
    customDocUsage: customDocLimit,
    
    // Helper functions
    getUsagePercentage: (limit: UsageLimit | undefined) => {
      if (!limit || limit.limit === -1) return 0;
      return limit.limit > 0 ? (limit.current / limit.limit) * 100 : 0;
    },
    
    isNearLimit: (limit: UsageLimit | undefined, threshold: number = 80) => {
      if (!limit || limit.limit === -1) return false;
      const percentage = limit.limit > 0 ? (limit.current / limit.limit) * 100 : 0;
      return percentage >= threshold;
    },
  };
}

/**
 * Hook to get comprehensive usage overview
 */
export function useUsageOverview() {
  const { data: stats, isLoading: statsLoading } = useUsageStats();
  const { data: limits, isLoading: limitsLoading } = useUserLimits();
  const { data: alerts, isLoading: alertsLoading } = useBillingAlerts(true); // Only unread alerts

  const isLoading = statsLoading || limitsLoading || alertsLoading;

  const overview = {
    stats: stats || { ai_queries: 0, document_uploads: 0, document_downloads: 0, custom_documents: 0 },
    limits: limits || { ai_query: 0, document_upload: 0, document_download: 0, custom_document: 0 },
    unreadAlerts: alerts || [],
    
    // Calculated values
    usagePercentages: {
      ai_queries: limits?.ai_query && limits.ai_query > 0 ? ((stats?.ai_queries || 0) / limits.ai_query) * 100 : 0,
      document_uploads: limits?.document_upload && limits.document_upload > 0 ? ((stats?.document_uploads || 0) / limits.document_upload) * 100 : 0,
      custom_documents: limits?.custom_document && limits.custom_document > 0 ? ((stats?.custom_documents || 0) / limits.custom_document) * 100 : 0,
    },
    
    hasUnreadAlerts: (alerts?.length || 0) > 0,
    isNearAnyLimit: false, // Will be calculated below
  };

  // Check if near any limit (80% threshold)
  overview.isNearAnyLimit = Object.values(overview.usagePercentages).some(percentage => percentage >= 80);

  return {
    ...overview,
    isLoading,
  };
}
