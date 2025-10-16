import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { AuraChat } from './AuraChat';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import auraAvatar from '@/assets/aura.png';

export function AuraButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        title="Falar com AURA"
      >
        <Avatar className="h-12 w-12">
          <AvatarImage src={auraAvatar} alt="AURA" />
          <AvatarFallback>
            <MessageCircle className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      </Button>
      <AuraChat open={open} onOpenChange={setOpen} />
    </>
  );
}
