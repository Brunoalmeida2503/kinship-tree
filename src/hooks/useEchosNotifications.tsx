import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';

interface UnreadMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  conversation_id: string;
}

export const useEchosNotifications = () => {
  const { user } = useAuth();
  const shownNotifications = useRef<Set<string>>(new Set());
  const initialCheckDone = useRef(false);

  // Check for unread messages on initial load
  const checkUnreadMessages = useCallback(async () => {
    if (!user || initialCheckDone.current) return;
    initialCheckDone.current = true;

    try {
      // Get user's conversations
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participantData || participantData.length === 0) return;

      const conversationIds = participantData.map(p => p.conversation_id);

      // Get unread messages (not sent by current user and not read)
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id, content, sender_id, conversation_id, created_at')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!unreadMessages || unreadMessages.length === 0) return;

      // Get sender profiles
      const senderIds = [...new Set(unreadMessages.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Count total unread
      const totalUnread = unreadMessages.length;

      if (totalUnread === 1) {
        const msg = unreadMessages[0];
        const senderName = profileMap.get(msg.sender_id) || 'Alguém';
        toast.info(`Nova mensagem de ${senderName}`, {
          description: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          icon: <MessageCircle className="h-4 w-4" />,
          action: {
            label: 'Ver',
            onClick: () => window.location.href = '/echos'
          },
          duration: 8000,
        });
      } else if (totalUnread > 1) {
        toast.info(`Você tem ${totalUnread} mensagens não lidas`, {
          description: 'Clique para ver suas conversas',
          icon: <MessageCircle className="h-4 w-4" />,
          action: {
            label: 'Ver',
            onClick: () => window.location.href = '/echos'
          },
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  }, [user]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!user) return;

    // Check unread messages on mount
    checkUnreadMessages();

    // Get user's conversations first
    const setupSubscription = async () => {
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!participantData || participantData.length === 0) return null;

      // Subscribe to new messages across all user's conversations
      const channel = supabase
        .channel('echos-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          async (payload) => {
            const newMsg = payload.new as any;
            
            // Skip if it's own message or already shown
            if (newMsg.sender_id === user.id) return;
            if (shownNotifications.current.has(newMsg.id)) return;
            
            // Check if message is in user's conversations
            const isUserConversation = participantData.some(
              p => p.conversation_id === newMsg.conversation_id
            );
            
            if (!isUserConversation) return;

            // Mark as shown
            shownNotifications.current.add(newMsg.id);

            // Get sender profile
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', newMsg.sender_id)
              .maybeSingle();

            const senderName = senderProfile?.full_name || 'Alguém';

            // Show toast notification
            toast.info(`Nova mensagem de ${senderName}`, {
              description: newMsg.content.substring(0, 50) + (newMsg.content.length > 50 ? '...' : ''),
              icon: <MessageCircle className="h-4 w-4" />,
              action: {
                label: 'Ver',
                onClick: () => window.location.href = '/echos'
              },
              duration: 5000,
            });
          }
        )
        .subscribe();

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    setupSubscription().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, checkUnreadMessages]);

  return { checkUnreadMessages };
};
