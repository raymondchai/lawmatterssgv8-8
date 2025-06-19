/**
 * React hooks for AI functionality
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  aiApi, 
  ChatMessage, 
  ChatRequest, 
  DocumentProcessingRequest,
  TemplateGenerationRequest 
} from '@/lib/api/ai';

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>();

  const sendMessageMutation = useMutation({
    mutationFn: (request: ChatRequest) => aiApi.sendChatMessage(request),
    onSuccess: (response, variables) => {
      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: variables.message,
        timestamp: new Date().toISOString(),
      };

      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage, aiMessage]);
      setConversationId(response.conversationId);
    },
    onError: (error) => {
      toast.error(`Chat error: ${error.message}`);
    },
  });

  const sendMessage = useCallback((
    message: string,
    documentIds?: string[],
    useRAG?: boolean
  ) => {
    sendMessageMutation.mutate({
      message,
      conversationId,
      documentIds,
      useRAG,
    });
  }, [conversationId, sendMessageMutation]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
  }, []);

  return {
    messages,
    conversationId,
    sendMessage,
    clearChat,
    isLoading: sendMessageMutation.isPending,
    error: sendMessageMutation.error,
  };
}

export function useDocumentProcessing() {
  const queryClient = useQueryClient();

  const processDocumentMutation = useMutation({
    mutationFn: (request: DocumentProcessingRequest) => aiApi.processDocument(request),
    onSuccess: (_, variables) => {
      // Invalidate document queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', variables.documentId] });
      
      toast.success(`Document ${variables.operation} completed successfully`);
    },
    onError: (error) => {
      toast.error(`Processing error: ${error.message}`);
    },
  });

  const extractText = useCallback((documentId: string) => {
    return processDocumentMutation.mutateAsync({
      documentId,
      operation: 'extract-text',
    });
  }, [processDocumentMutation]);

  const generateEmbeddings = useCallback((documentId: string) => {
    return processDocumentMutation.mutateAsync({
      documentId,
      operation: 'generate-embeddings',
    });
  }, [processDocumentMutation]);

  const classifyDocument = useCallback((documentId: string) => {
    return processDocumentMutation.mutateAsync({
      documentId,
      operation: 'classify',
    });
  }, [processDocumentMutation]);

  const summarizeDocument = useCallback((documentId: string) => {
    return processDocumentMutation.mutateAsync({
      documentId,
      operation: 'summarize',
    });
  }, [processDocumentMutation]);

  return {
    extractText,
    generateEmbeddings,
    classifyDocument,
    summarizeDocument,
    isProcessing: processDocumentMutation.isPending,
    error: processDocumentMutation.error,
  };
}

export function useTemplateGeneration() {
  const queryClient = useQueryClient();

  const generateTemplateMutation = useMutation({
    mutationFn: (request: TemplateGenerationRequest) => aiApi.generateTemplate(request),
    onSuccess: () => {
      // Invalidate templates queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template generated successfully');
    },
    onError: (error) => {
      toast.error(`Template generation error: ${error.message}`);
    },
  });

  const generateTemplate = useCallback((
    templateType: string,
    description: string,
    variables?: Record<string, any>,
    customInstructions?: string
  ) => {
    return generateTemplateMutation.mutateAsync({
      templateType,
      description,
      variables,
      customInstructions,
    });
  }, [generateTemplateMutation]);

  return {
    generateTemplate,
    isGenerating: generateTemplateMutation.isPending,
    error: generateTemplateMutation.error,
  };
}

export function useUsageStats(periodDays: number = 30) {
  return useQuery({
    queryKey: ['usage-stats', periodDays],
    queryFn: () => aiApi.getUsageStats(periodDays),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUsageLimit(operation: string) {
  return useQuery({
    queryKey: ['usage-limit', operation],
    queryFn: () => aiApi.checkUsageLimit(operation),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useChatHistory(conversationId?: string) {
  return useQuery({
    queryKey: ['chat-history', conversationId],
    queryFn: () => conversationId ? aiApi.getChatHistory(conversationId) : Promise.resolve([]),
    enabled: !!conversationId,
  });
}

export function useDocumentQuestion() {
  const askQuestionMutation = useMutation({
    mutationFn: ({ 
      question, 
      documentIds, 
      conversationId 
    }: { 
      question: string; 
      documentIds: string[]; 
      conversationId?: string; 
    }) => aiApi.askDocumentQuestion(question, documentIds, conversationId),
    onError: (error) => {
      toast.error(`Question error: ${error.message}`);
    },
  });

  const askQuestion = useCallback((
    question: string,
    documentIds: string[],
    conversationId?: string
  ) => {
    return askQuestionMutation.mutateAsync({
      question,
      documentIds,
      conversationId,
    });
  }, [askQuestionMutation]);

  return {
    askQuestion,
    isAsking: askQuestionMutation.isPending,
    error: askQuestionMutation.error,
    data: askQuestionMutation.data,
  };
}

// Utility hook to check if AI features are enabled
export function useAIFeatures() {
  const { data: chatLimit } = useUsageLimit('ai_chat');
  const { data: analysisLimit } = useUsageLimit('document_analysis');
  const { data: templateLimit } = useUsageLimit('template_generation');

  return {
    canUseChat: chatLimit?.allowed ?? false,
    canUseAnalysis: analysisLimit?.allowed ?? false,
    canUseTemplates: templateLimit?.allowed ?? false,
    chatUsage: chatLimit,
    analysisUsage: analysisLimit,
    templateUsage: templateLimit,
  };
}
