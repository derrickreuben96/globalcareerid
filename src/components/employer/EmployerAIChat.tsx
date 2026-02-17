import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  Send, 
  X, 
  Loader2, 
  Sparkles,
  Users,
  FileText,
  TrendingUp,
} from 'lucide-react';

interface EmployerAIChatProps {
  employerId: string;
  companyName: string;
  employeeCount: number;
  isVerified: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const quickActions = [
  { label: 'Draft job description', icon: FileText, prompt: 'Help me write a professional job description for a new role at our company.' },
  { label: 'Workforce insights', icon: TrendingUp, prompt: 'Based on best practices, what workforce management strategies should I consider for my team?' },
  { label: 'Onboarding checklist', icon: Users, prompt: 'Create a comprehensive employee onboarding checklist for new hires.' },
  { label: 'HR policy template', icon: FileText, prompt: 'Help me draft a key HR policy document for our organization.' },
];

export function EmployerAIChat({ employerId, companyName, employeeCount, isVerified }: EmployerAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to use the AI assistant.' }]);
        setIsLoading(false);
        return;
      }

      const employerContext = `You are an AI assistant for ${companyName} on the Global Career ID platform. You help employers with:
- Writing job descriptions and role requirements
- HR policy guidance and templates
- Employee onboarding best practices
- Workforce management strategies
- Understanding employment verification processes
- Compliance and documentation advice

Company context: ${companyName} currently has ${employeeCount} employee records on the platform. ${isVerified ? 'The company is verified.' : 'The company is pending verification.'}

Be professional, concise, and actionable. Format responses with markdown when helpful.`;

      // Build messages array with employer context as a system-like user message
      const apiMessages = [
        { role: 'user' as const, content: `[System context - do not repeat this]: ${employerContext}` },
        { role: 'assistant' as const, content: 'Understood. I\'m ready to help with your HR and workforce needs. How can I assist you?' },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'AI service error');
      }

      // Process SSE streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      if (!assistantContent) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: 'I apologize, I couldn\'t process that request. Please try again.' };
          return updated;
        });
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium text-sm">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[600px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Employer tools & guidance</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[380px]">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">How can I help?</p>
              <p className="text-xs text-muted-foreground mt-1">Ask me anything about managing your workforce</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  className="flex items-center gap-2 p-2.5 text-left text-xs rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors"
                >
                  <action.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask about HR, hiring, policies..."
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}