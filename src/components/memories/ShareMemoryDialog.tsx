import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Users, UserPlus, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShareMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoryId: string;
}

interface Connection {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
}

export function ShareMemoryDialog({ open, onOpenChange, memoryId }: ShareMemoryDialogProps) {
  const [shareWithTree, setShareWithTree] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, memoryId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar configuração atual da memória
      const { data: memory } = await supabase
        .from('memories')
        .select('share_with_tree')
        .eq('id', memoryId)
        .single();

      if (memory) {
        setShareWithTree(memory.share_with_tree || false);
      }

      // Carregar compartilhamentos existentes
      const { data: shares } = await supabase
        .from('memory_shares')
        .select('shared_with_user_id, shared_with_group_id')
        .eq('memory_id', memoryId);

      if (shares) {
        setSelectedUsers(shares.filter(s => s.shared_with_user_id).map(s => s.shared_with_user_id!));
        setSelectedGroups(shares.filter(s => s.shared_with_group_id).map(s => s.shared_with_group_id!));
      }

      // Carregar conexões aceitas
      const { data: connectionsData } = await supabase
        .from('connections')
        .select(`
          requester_id,
          receiver_id,
          requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
          receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const connectionsList: Connection[] = [];
      connectionsData?.forEach((conn: any) => {
        if (conn.requester_id === user.id && conn.receiver) {
          connectionsList.push(conn.receiver);
        } else if (conn.receiver_id === user.id && conn.requester) {
          connectionsList.push(conn.requester);
        }
      });

      setConnections(connectionsList);

      // Carregar grupos
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name, avatar_url')
        .in('id', 
          (await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', user.id)
          ).data?.map(g => g.group_id) || []
        );

      setGroups(groupsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de compartilhamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Atualizar share_with_tree
      const { error: updateError } = await supabase
        .from('memories')
        .update({ share_with_tree: shareWithTree })
        .eq('id', memoryId);

      if (updateError) throw updateError;

      // Remover compartilhamentos antigos
      const { error: deleteError } = await supabase
        .from('memory_shares')
        .delete()
        .eq('memory_id', memoryId);

      if (deleteError) throw deleteError;

      // Adicionar novos compartilhamentos com usuários
      if (selectedUsers.length > 0) {
        const userShares = selectedUsers.map(userId => ({
          memory_id: memoryId,
          shared_by: user.id,
          shared_with_user_id: userId,
          shared_with_group_id: null
        }));

        const { error: insertUserError } = await supabase
          .from('memory_shares')
          .insert(userShares);

        if (insertUserError) throw insertUserError;
      }

      // Adicionar novos compartilhamentos com grupos
      if (selectedGroups.length > 0) {
        const groupShares = selectedGroups.map(groupId => ({
          memory_id: memoryId,
          shared_by: user.id,
          shared_with_user_id: null,
          shared_with_group_id: groupId
        }));

        const { error: insertGroupError } = await supabase
          .from('memory_shares')
          .insert(groupShares);

        if (insertGroupError) throw insertGroupError;
      }

      toast.success('Compartilhamento atualizado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao atualizar compartilhamento');
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Compartilhar Memória</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Compartilhar com árvore */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="share-tree" className="cursor-pointer">
                    Compartilhar com toda a árvore
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Todos os seus contatos poderão ver
                  </p>
                </div>
              </div>
              <Switch
                id="share-tree"
                checked={shareWithTree}
                onCheckedChange={setShareWithTree}
              />
            </div>

            {/* Compartilhar com usuários específicos */}
            {connections.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <Label>Compartilhar com usuários</Label>
                </div>
                <ScrollArea className="h-40 border rounded-md p-3">
                  <div className="space-y-2">
                    {connections.map((connection) => (
                      <div key={connection.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${connection.id}`}
                          checked={selectedUsers.includes(connection.id)}
                          onCheckedChange={() => toggleUser(connection.id)}
                        />
                        <label
                          htmlFor={`user-${connection.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {connection.full_name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Compartilhar com grupos */}
            {groups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label>Compartilhar com grupos</Label>
                </div>
                <ScrollArea className="h-32 border rounded-md p-3">
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={() => toggleGroup(group.id)}
                        />
                        <label
                          htmlFor={`group-${group.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {group.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
