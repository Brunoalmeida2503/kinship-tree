import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, ArrowLeft, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  updated_at: string;
  participants: Profile[];
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender?: Profile;
}

const Echos = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [connections, setConnections] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchConnections();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!selectedConversation) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .maybeSingle();
          
          setMessages(prev => [...prev, { ...newMsg, sender: senderProfile || undefined }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get conversations where user is participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Get conversations with participants
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // For each conversation, get participants and last message
      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          // Get participants
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);

          const participantIds = participants?.map(p => p.user_id) || [];

          // Get profiles
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', participantIds);

          // Get last message
          const { data: lastMessages } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conv,
            participants: (profiles || []).filter(p => p.id !== user.id),
            lastMessage: lastMessages?.[0]
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('connections')
      .select(`
        requester_id,
        receiver_id,
        requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching connections:', error);
      return;
    }

    const connectedProfiles = data?.map(conn => {
      if (conn.requester_id === user.id) {
        return conn.receiver as unknown as Profile;
      }
      return conn.requester as unknown as Profile;
    }).filter(Boolean) || [];

    setConnections(connectedProfiles);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Get sender profiles
    const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', senderIds);

    const messagesWithSenders = data?.map(msg => ({
      ...msg,
      sender: profiles?.find(p => p.id === msg.sender_id)
    })) || [];

    setMessages(messagesWithSenders);
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    setShowNewChat(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const startNewConversation = async (targetUser: Profile) => {
    if (!user) return;

    try {
      // Garantir que o profile do usuário atual existe (FK em conversations/conversation_participants)
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: (user.user_metadata as any)?.full_name || 'Usuário',
          avatar_url: (user.user_metadata as any)?.avatar_url || null,
        });

      // Check if conversation already exists
      const existingConv = conversations.find((conv) =>
        conv.participants.some((p) => p.id === targetUser.id)
      );

      if (existingConv) {
        selectConversation(existingConv);
        return;
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ created_by: user.id })
        .select()
        .maybeSingle();

      if (convError) throw convError;
      if (!newConv) throw new Error('Conversa não foi criada');

      // Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: targetUser.id },
        ]);

      if (partError) throw partError;

      const newConversation: Conversation = {
        ...newConv,
        participants: [targetUser],
      };

      setConversations((prev) => [newConversation, ...prev]);
      selectConversation(newConversation);
      toast.success('Conversa iniciada!');
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      const msg = error?.message || 'Erro ao iniciar conversa';
      toast.error(msg);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants[0];
  };

  const filteredConnections = connections.filter(conn =>
    conn.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 max-w-4xl h-[calc(100vh-80px)]">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {selectedConversation && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Echos</h1>
          </div>
          {!showNewChat && !selectedConversation && (
            <Button onClick={() => setShowNewChat(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova conversa
            </Button>
          )}
        </div>

        <Card className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Conversations List */}
            <div className={`w-full md:w-1/3 border-r flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {showNewChat ? (
                <div className="flex flex-col h-full">
                  <div className="p-3 border-b flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setShowNewChat(false)}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-medium">Nova conversa</span>
                  </div>
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar conexões..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    {filteredConnections.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Nenhuma conexão encontrada
                      </div>
                    ) : (
                      filteredConnections.map(conn => (
                        <div
                          key={conn.id}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => startNewConversation(conn)}
                        >
                          <Avatar>
                            <AvatarImage src={conn.avatar_url || ''} />
                            <AvatarFallback>{conn.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{conn.full_name}</span>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma conversa ainda</p>
                      <p className="text-sm">Inicie uma nova conversa!</p>
                    </div>
                  ) : (
                    conversations.map(conv => {
                      const other = getOtherParticipant(conv);
                      return (
                        <div
                          key={conv.id}
                          className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b ${
                            selectedConversation?.id === conv.id ? 'bg-muted/50' : ''
                          }`}
                          onClick={() => selectConversation(conv)}
                        >
                          <Avatar>
                            <AvatarImage src={other?.avatar_url || ''} />
                            <AvatarFallback>{other?.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{other?.full_name || 'Usuário'}</p>
                            {conv.lastMessage && (
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage.content}
                              </p>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(conv.lastMessage.created_at), 'HH:mm', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </ScrollArea>
              )}
            </div>

            {/* Messages Area */}
            <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 border-b flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={getOtherParticipant(selectedConversation)?.avatar_url || ''} />
                      <AvatarFallback>
                        {getOtherParticipant(selectedConversation)?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {getOtherParticipant(selectedConversation)?.full_name || 'Usuário'}
                    </span>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3">
                      {messages.map(msg => {
                        const isOwn = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              }`}
                            >
                              <p className="break-words">{msg.content}</p>
                              <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        disabled={sendingMessage}
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        size="icon"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Selecione uma conversa</p>
                    <p className="text-sm">ou inicie uma nova</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Echos;
