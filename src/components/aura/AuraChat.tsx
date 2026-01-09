import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Sparkles, Trash2, Mic, Square, X, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import auraAvatar from '@/assets/aura.png';
import { cn } from '@/lib/utils';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

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

const quickSuggestions = [
  { icon: '👋', text: 'Como você pode me ajudar?' },
  { icon: '🌳', text: 'Me fale sobre a árvore genealógica' },
  { icon: '📅', text: 'Como criar uma memória?' },
  { icon: '👥', text: 'Como encontrar parentes?' },
];

export function AuraChat({ open, onOpenChange }: AuraChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [userVoice, setUserVoice] = useState('sarah');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

  useEffect(() => {
    if (open) {
      loadHistory();
      loadUserVoice();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    setShowWelcome(messages.length === 0);
  }, [messages]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const clearHistory = async () => {
    if (!user) return;

    try {
      await supabase
        .from('aura_conversations')
        .delete()
        .eq('user_id', user.id);
      
      setMessages([]);
      toast.success('Histórico limpo com sucesso!');
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('Erro ao limpar histórico');
    }
  };

  const loadUserVoice = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('aura_voice')
        .eq('id', user.id)
        .single();
      
      if (data?.aura_voice) {
        setUserVoice(data.aura_voice);
      }
    } catch (error) {
      console.error('Error loading user voice:', error);
    }
  };

  const speakText = async (text: string, messageId: string) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setIsSpeaking(true);
      setPlayingMessageId(messageId);

      const session = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aura-speak`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ text, voice: userVoice }),
        }
      );

      if (!response.ok) {
        throw new Error('TTS failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error speaking:', error);
      setIsSpeaking(false);
      setPlayingMessageId(null);
      toast.error('Erro ao reproduzir áudio');
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setPlayingMessageId(null);
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      setIsTranscribing(true);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aura-transcribe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Erro ao transcrever áudio');
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast.error('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob) {
      const transcribedText = await transcribeAudio(audioBlob);
      if (transcribedText) {
        sendMessage(transcribedText);
      }
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
    toast.info('Gravação cancelada');
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    if (!user) {
      toast.error('Você precisa estar autenticado para usar o chat.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada. Por favor, faça login novamente.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('aura-chat', {
        body: { message: textToSend }
      });

      if (error) {
        console.error('Edge function error:', error);
        if (error.message?.includes('429')) {
          toast.error('Muitas requisições. Por favor, aguarde um momento.');
        } else if (error.message?.includes('402')) {
          toast.error('Limite de uso atingido. Entre em contato com o suporte.');
        } else if (error.message?.includes('Unauthorized')) {
          toast.error('Sessão expirada. Por favor, faça login novamente.');
        } else {
          throw error;
        }
        return;
      }

      const assistantMessageId = Date.now().toString() + '-assistant';
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Auto-speak the response if enabled
      if (autoSpeak) {
        setTimeout(() => {
          speakText(data.response, assistantMessageId);
        }, 300);
      }
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

  const handleSuggestionClick = (text: string) => {
    sendMessage(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] sm:h-[700px] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header com gradiente */}
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={auraAvatar} alt="AURA" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60">AU</AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                  isSpeaking ? "bg-primary animate-pulse" : "bg-green-500 animate-pulse"
                )} />
              </div>
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  AURA
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </DialogTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  {isLoading ? (
                    <>
                      <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                      <span className="ml-1">Pensando...</span>
                    </>
                  ) : isTranscribing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="ml-1">Transcrevendo...</span>
                    </>
                  ) : isSpeaking ? (
                    <>
                      <Volume2 className="h-3 w-3 animate-pulse" />
                      <span className="ml-1">Falando...</span>
                    </>
                  ) : (
                    'Online • Pronta para ajudar'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={cn(
                  "h-8 w-8",
                  autoSpeak ? "text-primary" : "text-muted-foreground"
                )}
                title={autoSpeak ? "Desativar resposta por voz" : "Ativar resposta por voz"}
              >
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Limpar histórico"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Área de mensagens */}
        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="py-4">
            {showWelcome ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-6 animate-in fade-in duration-500">
                <div className="relative">
                  <Avatar className="h-28 w-28 ring-4 ring-primary/20 ring-offset-4 ring-offset-background shadow-xl">
                    <AvatarImage src={auraAvatar} alt="AURA" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-2xl">AU</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-2xl">Olá! Eu sou a AURA 💫</h3>
                  <p className="text-muted-foreground max-w-md leading-relaxed">
                    Sua assistente pessoal na Tree. Posso ajudar com dúvidas, 
                    buscar pessoas, apoiar em atividades e muito mais!
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Mic className="h-4 w-4" />
                    Envie áudio e eu respondo com voz!
                  </p>
                </div>
                
                {/* Sugestões rápidas */}
                <div className="w-full max-w-md space-y-2 pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Sugestões</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickSuggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto py-3 px-4 justify-start text-left hover:bg-primary/5 hover:border-primary/30 transition-all group"
                        onClick={() => handleSuggestionClick(suggestion.text)}
                      >
                        <span className="text-lg mr-2 group-hover:scale-110 transition-transform">{suggestion.icon}</span>
                        <span className="text-sm truncate">{suggestion.text}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Avatar className={cn(
                      "h-8 w-8 mt-1 shrink-0",
                      msg.role === 'assistant' && "ring-2 ring-primary/20"
                    )}>
                      {msg.role === 'assistant' ? (
                        <>
                          <AvatarImage src={auraAvatar} alt="AURA" />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-xs">AU</AvatarFallback>
                        </>
                      ) : (
                        <AvatarFallback className="bg-muted text-xs">Eu</AvatarFallback>
                      )}
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-md'
                          : 'bg-muted rounded-tl-md'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <div className={cn(
                        "flex items-center gap-2 mt-1",
                        msg.role === 'user' ? 'justify-end' : 'justify-between'
                      )}>
                        <p className="text-[10px] opacity-60">
                          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {msg.role === 'assistant' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => playingMessageId === msg.id ? stopSpeaking() : speakText(msg.content, msg.id)}
                            className="h-6 w-6 opacity-60 hover:opacity-100"
                            title={playingMessageId === msg.id ? "Parar" : "Ouvir"}
                          >
                            {playingMessageId === msg.id ? (
                              <Square className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Avatar className="h-8 w-8 mt-1 ring-2 ring-primary/20">
                      <AvatarImage src={auraAvatar} alt="AURA" />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-xs">AU</AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="inline-block w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="inline-block w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input área */}
        <div className="p-4 sm:p-6 pt-4 border-t bg-background/80 backdrop-blur-sm">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 bg-destructive/10 rounded-full px-4 py-2">
                <span className="h-3 w-3 bg-destructive rounded-full animate-pulse" />
                <span className="text-sm font-medium text-destructive">
                  Gravando... {formatTime(recordingTime)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelRecording}
                className="rounded-full h-10 w-10 text-muted-foreground hover:text-destructive"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleStopRecording}
                size="icon"
                className="rounded-full h-10 w-10 bg-destructive hover:bg-destructive/90"
              >
                <Square className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite ou envie um áudio..."
                disabled={isLoading || isTranscribing}
                className="flex-1 rounded-full px-4 border-primary/20 focus-visible:ring-primary/30"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleStartRecording}
                disabled={isLoading || isTranscribing}
                className="rounded-full h-10 w-10 shrink-0 hover:bg-primary/10 hover:border-primary/30"
                title="Enviar mensagem de voz"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading || isTranscribing}
                size="icon"
                className="rounded-full h-10 w-10 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {autoSpeak ? '🔊 Resposta por voz ativada' : '🔇 Resposta por voz desativada'} • AURA pode cometer erros
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}