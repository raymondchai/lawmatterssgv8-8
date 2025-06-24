import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  publicDocumentAnalysisService,
  type PublicDocumentAnalysis,
  type PublicAnalysisSession
} from '@/lib/services/publicDocumentAnalysis';
import { publicAnalyticsService } from '@/lib/services/publicAnalytics';

interface UsePublicDocumentAnalysisOptions {
  autoCheckRateLimit?: boolean;
  rateLimitCheckInterval?: number; // in milliseconds
}

interface AnalysisState {
  isAnalyzing: boolean;
  progress: number;
  error: string | null;
  currentAnalysis: PublicDocumentAnalysis | null;
}

export function usePublicDocumentAnalysis(options: UsePublicDocumentAnalysisOptions = {}) {
  const {
    autoCheckRateLimit = true,
    rateLimitCheckInterval = 60000 // 1 minute
  } = options;

  const queryClient = useQueryClient();
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    progress: 0,
    error: null,
    currentAnalysis: null
  });

  // Get user's IP address
  const getUserIP = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');

      if (!response?.ok) {
        console.warn('Failed to get IP address, using fallback');
        return '127.0.0.1';
      }

      const data = await response.json();
      return data?.ip ?? '127.0.0.1';
    } catch {
      return '127.0.0.1'; // Fallback
    }
  }, []);

  // Initialize analytics session on mount
  useEffect(() => {
    publicAnalyticsService.initializeSession();
    publicAnalyticsService.trackPageView('public_analysis');
  }, []);

  // Rate limit status query
  const {
    data: rateLimitStatus,
    error: rateLimitError,
    refetch: refetchRateLimit,
    isLoading: isCheckingRateLimit
  } = useQuery({
    queryKey: ['publicRateLimit'],
    queryFn: async () => {
      const ip = await getUserIP();
      const result = await publicDocumentAnalysisService.checkRateLimit(ip);

      // Track rate limit check
      if (!result.allowed) {
        await publicAnalyticsService.trackRateLimit(
          result.remaining.hourly === 0 ? 'hourly' : 'daily',
          result.remaining.hourly + result.remaining.daily
        );
      }

      return result;
    },
    enabled: autoCheckRateLimit,
    refetchInterval: rateLimitCheckInterval,
    staleTime: 30000, // 30 seconds
    retry: 2
  });

  // Session management
  const sessionMutation = useMutation({
    mutationFn: async () => {
      const ip = await getUserIP();
      const userAgent = navigator.userAgent;
      return publicDocumentAnalysisService.getOrCreateSession(ip, userAgent);
    },
    onError: (error) => {
      console.error('Session creation failed:', error);
      setAnalysisState(prev => ({
        ...prev,
        error: 'Failed to create analysis session'
      }));
    }
  });

  // Document analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async ({ file, session, startTime }: { file: File; session: PublicAnalysisSession; startTime: number }) => {
      const ip = await getUserIP();

      // Track document upload
      await publicAnalyticsService.trackDocumentUpload(file.size, file.type, file.name);

      const result = await publicDocumentAnalysisService.analyzeDocument(file, session.id, ip);

      // Track analysis completion
      const processingTime = Date.now() - startTime;
      await publicAnalyticsService.trackAnalysisComplete(
        result.id,
        processingTime,
        result.analysisResult.documentType,
        result.analysisResult.textLength
      );

      return result;
    },
    onSuccess: (analysis) => {
      setAnalysisState(prev => ({
        ...prev,
        currentAnalysis: analysis,
        isAnalyzing: false,
        progress: 100,
        error: null
      }));

      // Invalidate rate limit to get updated counts
      queryClient.invalidateQueries({ queryKey: ['publicRateLimit'] });
    },
    onError: (error) => {
      console.error('Analysis failed:', error);

      // Track error
      publicAnalyticsService.trackError(
        'analysis_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Analysis failed'
      }));
    }
  });

  // Get analysis result by ID
  const getAnalysisResult = useCallback(async (analysisId: string): Promise<PublicDocumentAnalysis | null> => {
    try {
      return await publicDocumentAnalysisService.getAnalysisResult(analysisId);
    } catch (error) {
      console.error('Failed to get analysis result:', error);
      return null;
    }
  }, []);

  // Analyze document function
  const analyzeDocument = useCallback(async (file: File) => {
    const startTime = Date.now();

    setAnalysisState(prev => ({
      ...prev,
      isAnalyzing: true,
      progress: 0,
      error: null,
      currentAnalysis: null
    }));

    try {
      // Track analysis start
      await publicAnalyticsService.trackEvent('analysis_started', {
        file_size: file.size,
        file_type: file.type,
        file_name_length: file.name.length
      });

      // Validate file
      const validation = publicDocumentAnalysisService.validateFile(file);
      if (!validation.valid) {
        await publicAnalyticsService.trackError('validation_failed', validation.error || 'File validation failed');
        throw new Error(validation.error);
      }

      setAnalysisState(prev => ({ ...prev, progress: 10 }));

      // Check rate limits
      const ip = await getUserIP();
      const rateLimit = await publicDocumentAnalysisService.checkRateLimit(ip);

      if (!rateLimit.allowed) {
        await publicAnalyticsService.trackRateLimit(
          rateLimit.remaining.hourly === 0 ? 'hourly' : 'daily',
          rateLimit.remaining.hourly + rateLimit.remaining.daily
        );
        throw new Error(rateLimit.message || 'Rate limit exceeded');
      }

      setAnalysisState(prev => ({ ...prev, progress: 20 }));

      // Get or create session
      const session = await sessionMutation.mutateAsync();

      setAnalysisState(prev => ({ ...prev, progress: 40 }));

      // Analyze document
      const analysis = await analysisMutation.mutateAsync({ file, session, startTime });

      return analysis;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 0,
        error: errorMessage
      }));
      throw error;
    }
  }, [sessionMutation, analysisMutation, getUserIP]);

  // Reset analysis state
  const resetAnalysis = useCallback(() => {
    setAnalysisState({
      isAnalyzing: false,
      progress: 0,
      error: null,
      currentAnalysis: null
    });
  }, []);

  // Check if user can analyze more documents
  const canAnalyze = useCallback(() => {
    if (!rateLimitStatus) return false;
    return rateLimitStatus.allowed && !analysisState.isAnalyzing;
  }, [rateLimitStatus, analysisState.isAnalyzing]);

  // Get remaining usage
  const getRemainingUsage = useCallback(() => {
    if (!rateLimitStatus) {
      return { hourly: 0, daily: 0 };
    }
    return rateLimitStatus.remaining;
  }, [rateLimitStatus]);

  // Auto-refresh rate limit when analysis completes
  useEffect(() => {
    if (analysisState.currentAnalysis && !analysisState.isAnalyzing) {
      refetchRateLimit();
    }
  }, [analysisState.currentAnalysis, analysisState.isAnalyzing, refetchRateLimit]);

  return {
    // State
    analysisState,
    rateLimitStatus,
    isCheckingRateLimit,
    rateLimitError,
    
    // Actions
    analyzeDocument,
    getAnalysisResult,
    resetAnalysis,
    refetchRateLimit,
    
    // Utilities
    canAnalyze,
    getRemainingUsage,
    getUserIP,
    
    // Loading states
    isCreatingSession: sessionMutation.isPending,
    isAnalyzing: analysisMutation.isPending || analysisState.isAnalyzing,
  };
}

// Hook for getting a specific analysis result
export function usePublicAnalysisResult(analysisId: string | undefined) {
  return useQuery({
    queryKey: ['publicAnalysisResult', analysisId],
    queryFn: () => {
      if (!analysisId) throw new Error('Analysis ID is required');
      return publicDocumentAnalysisService.getAnalysisResult(analysisId);
    },
    enabled: !!analysisId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for checking rate limits only
export function usePublicRateLimit() {
  const getUserIP = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');

      if (!response?.ok) {
        console.warn('Failed to get IP address, using fallback');
        return '127.0.0.1';
      }

      const data = await response.json();
      return data?.ip ?? '127.0.0.1';
    } catch {
      return '127.0.0.1';
    }
  }, []);

  return useQuery({
    queryKey: ['publicRateLimitOnly'],
    queryFn: async () => {
      const ip = await getUserIP();
      return publicDocumentAnalysisService.checkRateLimit(ip);
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000, // 30 seconds
    retry: 2
  });
}
