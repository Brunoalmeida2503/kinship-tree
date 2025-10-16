import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import auraAvatar from '@/assets/aura.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AuraChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuraChat({ open, onOpenChange }: AuraChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('aura_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      const historyMessages: Message[] = [];
      data?.forEach((conv) => {
        historyMessages.push({
          id: `${conv.id}-user`,
          role: 'user',
          content: conv.message,
          timestamp: new Date(conv.created_at)
        });
        historyMessages.push({
          id: `${conv.id}-assistant`,
          role: 'assistant',
          content: conv.response,
          timestamp: new Date(conv.created_at)
        });
      });

      setMessages(historyMessages);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('aura-chat', {
        body: { message: input }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Muitas requisições. Por favor, aguarde um momento.');
        } else if (error.message?.includes('402')) {
          toast.error('Limite de uso atingido. Entre em contato com o suporte.');
        } else {
          throw error;
        }
        return;
      }

      const assistantMessage: Message = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={auraAvatar} alt="AURA" />
              <AvatarFallback>AU</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">AURA</DialogTitle>
              <p className="text-sm text-muted-foreground">Sua assistente virtual inteligente</p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={auraAvatar} alt="AURA" />
                <AvatarFallback>AU</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg mb-2">Olá! Eu sou a AURA 👋</h3>
                <p className="text-muted-foreground max-w-md">
                  Estou aqui para ajudar com dúvidas, buscar pessoas, 
                  apoiar em atividades e muito mais. Como posso ajudar você hoje?
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8 mt-1">
                    {msg.role === 'assistant' ? (
                      <>
                        <AvatarImage src={auraAvatar} alt="AURA" />
                        <AvatarFallback>AU</AvatarFallback>
                      </>
                    ) : (
                      <AvatarFallback>Você</AvatarFallback>
                    )}
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={auraAvatar} alt="AURA" />
                    <AvatarFallback>AU</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-6 pt-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
