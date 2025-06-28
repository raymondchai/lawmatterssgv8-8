import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  Lightbulb, 
  AlertTriangle, 
  FileText,
  Loader2,
  Brain,
  Search
} from 'lucide-react';
import { ragKnowledgeBase, type RAGResponse, type KnowledgeChunk } from '@/lib/services/ragKnowledgeBase';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  ragResponse?: RAGResponse;
}

const PRACTICE_AREAS = [
  'Contract Law',
  'Employment Law',
  'Corporate Law',
  'Intellectual Property',
  'Real Estate',
  'Family Law',
  'Criminal Law',
  'Civil Litigation',
  'Data Protection',
  'Immigration Law'
];

export const RAGChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPracticeArea, setSelectedPracticeArea] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Generate RAG response
      const ragResponse = await ragKnowledgeBase.generateResponse(
        userMessage.content,
        {
          practiceArea: selectedPracticeArea || undefined,
          jurisdiction: 'Singapore'
        }
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ragResponse.answer,
        timestamp: new Date(),
        ragResponse
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive"
      });

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error while processing your question. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <Lightbulb className="h-3 w-3 text-green-500" />;
    if (confidence >= 0.5) return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
    return <AlertTriangle className="h-3 w-3 text-red-500" />;
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High confidence';
    if (confidence >= 0.5) return 'Medium confidence';
    return 'Low confidence';
  };

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <span>RAG Legal Assistant</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={selectedPracticeArea} onValueChange={setSelectedPracticeArea}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by practice area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Practice Areas</SelectItem>
                  {PRACTICE_AREAS.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Welcome to RAG Legal Assistant</h3>
                  <p className="text-sm">
                    Ask me any legal question about Singapore law. I'll search through our knowledge base 
                    to provide you with accurate, source-backed answers.
                  </p>
                  <div className="mt-4 text-xs space-y-1">
                    <p>• Employment law questions</p>
                    <p>• Contract law guidance</p>
                    <p>• Corporate compliance</p>
                    <p>• And much more...</p>
                  </div>
                </div>
              )}

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
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        
                        {message.ragResponse && (
                          <div className="mt-3 space-y-2">
                            {/* Confidence indicator */}
                            <div className="flex items-center space-x-1">
                              {getConfidenceIcon(message.ragResponse.confidence)}
                              <span className={`text-xs ${getConfidenceColor(message.ragResponse.confidence)}`}>
                                {getConfidenceText(message.ragResponse.confidence)} 
                                ({(message.ragResponse.confidence * 100).toFixed(1)}%)
                              </span>
                            </div>

                            {/* Sources */}
                            {message.ragResponse.sources.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium opacity-75">Sources:</div>
                                <div className="flex flex-wrap gap-1">
                                  {message.ragResponse.sources.map((source, index) => (
                                    <Badge 
                                      key={`${source.id}-${index}`} 
                                      variant="secondary" 
                                      className="text-xs"
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      {source.title}
                                      {source.similarity && (
                                        <span className="ml-1 opacity-75">
                                          ({(source.similarity * 100).toFixed(0)}%)
                                        </span>
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Reasoning */}
                            <div className="text-xs opacity-75 italic">
                              {message.ragResponse.reasoning}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex items-center space-x-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Searching knowledge base...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a legal question..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={isLoading || !inputValue.trim()}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Powered by RAG (Retrieval-Augmented Generation) with Singapore legal knowledge base
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
