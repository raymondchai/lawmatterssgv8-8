import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  FileText, 
  AlertTriangle,
  Lightbulb,
  MessageSquare
} from 'lucide-react';
import { chatWithAI } from '@/lib/api/openai';
import { semanticSearch } from '@/lib/api/search';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const chatSchema = z.object({
  message: z.string().min(1, 'Please enter a message'),
});

type ChatFormData = z.infer<typeof chatSchema>;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
  confidence?: number;
}

interface AIChatProps {
  className?: string;
  documentContext?: string[];
}

export const AIChat: React.FC<AIChatProps> = ({
  className = '',
  documentContext = []
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextDocuments, setContextDocuments] = useState<string[]>(documentContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChatFormData>({
    resolver: zodResolver(chatSchema),
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your AI legal assistant. I can help you with:

• Understanding legal documents
• Answering questions about Singapore law
• Explaining legal concepts and procedures
• Providing guidance on legal matters

Please note that this is for informational purposes only and does not constitute legal advice. For specific legal matters, please consult with a qualified lawyer.

How can I help you today?`,
        timestamp: new Date(),
        confidence: 1.0
      }]);
    }
  }, [messages.length]);

  const onSubmit = async (data: ChatFormData) => {
    if (!user) {
      toast.error('Please log in to use the AI chat');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: data.message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    reset();

    try {
      // Get relevant context from user's documents
      let relevantContext: string[] = [...contextDocuments];
      
      if (data.message.length > 10) {
        try {
          const searchResults = await semanticSearch({
            query: data.message,
            userId: user.id,
            maxResults: 3,
            similarityThreshold: 0.6
          });
          
          const contextChunks = searchResults.map(result => result.chunk_text);
          relevantContext = [...relevantContext, ...contextChunks];
        } catch (searchError) {
          console.warn('Failed to get document context:', searchError);
          // Continue without document context
        }
      }

      // Get conversation history (last 6 messages for context)
      const conversationHistory = messages
        .slice(-6)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Get AI response
      const response = await chatWithAI(
        data.message,
        relevantContext,
        conversationHistory
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        sources: response.sources,
        confidence: response.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
        timestamp: new Date(),
        confidence: 0
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">AI Legal Assistant</CardTitle>
          </div>
          {messages.length > 1 && (
            <Button variant="outline" size="sm" onClick={clearChat}>
              Clear Chat
            </Button>
          )}
        </div>
        <CardDescription>
          Ask questions about your documents or Singapore law
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    {message.role === 'user' && (
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      
                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs opacity-75">Sources:</div>
                          {message.sources.map((source, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <FileText className="h-3 w-3 mr-1" />
                              {source}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {/* Confidence indicator */}
                      {message.role === 'assistant' && message.confidence !== undefined && (
                        <div className="mt-2 flex items-center space-x-1">
                          {message.confidence >= 0.8 ? (
                            <Lightbulb className="h-3 w-3 text-green-500" />
                          ) : message.confidence >= 0.5 ? (
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-xs opacity-75">
                            {message.confidence >= 0.8 ? 'High confidence' : 
                             message.confidence >= 0.5 ? 'Medium confidence' : 'Low confidence'}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs opacity-75 mt-1">
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-4 w-4" />
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Disclaimer */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This AI assistant provides general information only and does not constitute legal advice. 
            Consult a qualified lawyer for specific legal matters.
          </AlertDescription>
        </Alert>

        {/* Input Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex space-x-2">
          <div className="flex-1">
            <Input
              {...register('message')}
              placeholder="Ask a legal question..."
              disabled={isLoading}
              className="w-full"
            />
            {errors.message && (
              <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isLoading} size="sm">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
