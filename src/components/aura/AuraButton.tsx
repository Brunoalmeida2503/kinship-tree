import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { AuraChat } from './AuraChat';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import auraAvatar from '@/assets/aura.png';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function AuraButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasInteractedToday, setHasInteractedToday] = useState(true); // Default true to avoid flash

  useEffect(() => {
    const checkTodayInteractions = async () => {
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('aura_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      setHasInteractedToday((count ?? 0) > 0);
    };

    checkTodayInteractions();
  }, [user]);

  useEffect(() => {
    // Mostrar tooltip após 3 segundos se não houve interação hoje
    if (hasInteractedToday) return;

    const timer = setTimeout(() => {
      setShowTooltip(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [hasInteractedToday]);

  useEffect(() => {
    // Esconder tooltip após 5 segundos
    if (showTooltip) {
      const timer = setTimeout(() => {
        setShowTooltip(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);

  const handleClick = () => {
    setHasInteractedToday(true);
    setShowTooltip(false);
    setOpen(true);
  };

  return (
    <>
      {/* Tooltip flutuante */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-40 transition-all duration-300",
          showTooltip ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
      >
        <div className="bg-background border rounded-lg shadow-lg p-3 max-w-[200px] relative">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute -top-2 -right-2 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="text-sm">
            👋 Oi! Eu sou a <strong>AURA</strong>. Posso te ajudar?
          </p>
          <div className="absolute bottom-0 right-8 translate-y-1/2 rotate-45 w-2 h-2 bg-background border-r border-b" />
        </div>
      </div>

      {/* Botão flutuante */}
      <Button
        onClick={handleClick}
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-all z-50",
          "bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
          "group overflow-hidden"
        )}
        title="Falar com AURA"
      >
        {/* Efeito de pulso */}
        <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
        
        {/* Avatar */}
        <Avatar className="h-12 w-12 transition-transform group-hover:scale-110">
          <AvatarImage src={auraAvatar} alt="AURA" className="object-cover" />
          <AvatarFallback className="bg-transparent">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </AvatarFallback>
        </Avatar>

        {/* Indicador online */}
        <span className="absolute top-1 right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-primary shadow-sm" />
      </Button>

      <AuraChat open={open} onOpenChange={setOpen} />
    </>
  );
}