import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, X, Search, Users } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Connection {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface MemoryParticipantsPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function MemoryParticipantsPicker({ selectedIds, onChange }: MemoryParticipantsPickerProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) fetchConnections();
  }, [user]);

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

    if (error) return;

    const list: Connection[] = (data || []).map((c: any) => {
      const isRequester = c.requester_id === user.id;
      const profile = isRequester ? c.receiver : c.requester;
      return { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url };
    });

    setConnections(list);
  };

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const remove = (id: string) => onChange(selectedIds.filter((s) => s !== id));

  const filtered = connections.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConnections = connections.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" />
        Participantes
      </Label>

      {/* Selected chips */}
      {selectedConnections.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedConnections.map((c) => (
            <Badge key={c.id} variant="secondary" className="flex items-center gap-1.5 pr-1 py-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={c.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">{c.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs">{c.full_name}</span>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Popover to add */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2 text-sm">
            <UserPlus className="h-3.5 w-3.5" />
            {selectedConnections.length > 0 ? 'Adicionar mais' : 'Adicionar pessoas'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar familiar ou amigo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {connections.length === 0 ? 'Você ainda não tem conexões.' : 'Nenhum resultado encontrado.'}
            </p>
          ) : (
            <div className="max-h-52 overflow-y-auto space-y-1">
              {filtered.map((c) => {
                const selected = selectedIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                      selected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={c.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{c.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{c.full_name}</span>
                    {selected && <X className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
