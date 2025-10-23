import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Share2, Loader2, Users, UsersRound, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ShareMemoryDialogProps {
  memoryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Connection {
  id: string;
  full_name: string;
}

interface Group {
  id: string;
  name: string;
}

interface Share {
  id: string;
  shared_with_user_id: string | null;
  shared_with_group_id: string | null;
  profiles?: { full_name: string };
  groups?: { name: string };
}

export function ShareMemoryDialog({ memoryId, open, onOpenChange }: ShareMemoryDialogProps) {
  const [shareWithTree, setShareWithTree] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [currentShares, setCurrentShares] = useState<Share[]>([]);
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

      // Carregar configuração atual
      const { data: memory } = await supabase
        .from('memories')
        .select('share_with_tree')
        .eq('id', memoryId)
        .single();
      
      if (memory) {
        setShareWithTree(memory.share_with_tree || false);
      }

      // Carregar conexões
      const { data: conns } = await supabase
        .from('connections')
        .select(`
          requester_id,
          receiver_id,
          requester:profiles!connections_requester_id_fkey(id, full_name),
          receiver:profiles!connections_receiver_id_fkey(id, full_name)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const connectionList: Connection[] = [];
      conns?.forEach((conn: any) => {
        if (conn.requester_id === user.id && conn.receiver) {
          connectionList.push({ id: conn.receiver.id, full_name: conn.receiver.full_name });
        } else if (conn.receiver_id === user.id && conn.requester) {
          connectionList.push({ id: conn.requester.id, full_name: conn.requester.full_name });
        }
      });
      setConnections(connectionList);

      // Carregar grupos
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('groups(id, name)')
        .eq('user_id', user.id);

      const groupList: Group[] = userGroups
        ?.map((item: any) => item.groups)
        .filter(Boolean) || [];
      setGroups(groupList);

      // Carregar compartilhamentos atuais
      const { data: shares } = await supabase
        .from('memory_shares')
        .select(`
          id,
          shared_with_user_id,
          shared_with_group_id,
          profiles(full_name),
          groups(name)
        `)
        .eq('memory_id', memoryId);

      setCurrentShares(shares || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareWithTree = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('memories')
        .update({ share_with_tree: !shareWithTree })
        .eq('id', memoryId);

      if (error) throw error;

      setShareWithTree(!shareWithTree);
      toast.success(!shareWithTree ? 'Memória compartilhada com a árvore!' : 'Compartilhamento com árvore removido');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar compartilhamento');
    } finally {
      setSaving(false);
    }
  };

  const handleShareWithUsers = async () => {
    if (selectedUsers.length === 0) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const shares = selectedUsers.map(userId => ({
        memory_id: memoryId,
        shared_by: user.id,
        shared_with_user_id: userId,
      }));

      const { error } = await supabase
        .from('memory_shares')
        .insert(shares);

      if (error) throw error;

      toast.success(`Memória compartilhada com ${selectedUsers.length} pessoa(s)!`);
      setSelectedUsers([]);
      loadData();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao compartilhar memória');
    } finally {
      setSaving(false);
    }
  };

  const handleShareWithGroups = async () => {
    if (selectedGroups.length === 0) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const shares = selectedGroups.map(groupId => ({
        memory_id: memoryId,
        shared_by: user.id,
        shared_with_group_id: groupId,
      }));

      const { error } = await supabase
        .from('memory_shares')
        .insert(shares);

      if (error) throw error;

      toast.success(`Memória compartilhada com ${selectedGroups.length} grupo(s)!`);
      setSelectedGroups([]);
      loadData();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao compartilhar memória');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('memory_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast.success('Compartilhamento removido');
      loadData();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao remover compartilhamento');
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Memória
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Compartilhar com árvore */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Checkbox
                id="share-tree"
                checked={shareWithTree}
                onCheckedChange={handleShareWithTree}
                disabled={saving}
              />
              <Label htmlFor="share-tree" className="cursor-pointer">
                Compartilhar com toda a árvore genealógica
              </Label>
            </div>
          </div>

          {/* Compartilhar com pessoas específicas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Compartilhar com pessoas específicas</Label>
              <Button 
                onClick={handleShareWithUsers} 
                disabled={selectedUsers.length === 0 || saving}
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Compartilhar ({selectedUsers.length})
              </Button>
            </div>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {connections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conexão disponível
                </p>
              ) : (
                connections.map((conn) => (
                  <div key={conn.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`user-${conn.id}`}
                      checked={selectedUsers.includes(conn.id)}
                      onCheckedChange={() => toggleUserSelection(conn.id)}
                      disabled={saving}
                    />
                    <Label htmlFor={`user-${conn.id}`} className="cursor-pointer flex-1">
                      {conn.full_name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Compartilhar com grupos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Compartilhar com grupos</Label>
              <Button 
                onClick={handleShareWithGroups} 
                disabled={selectedGroups.length === 0 || saving}
                size="sm"
              >
                <UsersRound className="h-4 w-4 mr-2" />
                Compartilhar ({selectedGroups.length})
              </Button>
            </div>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum grupo disponível
                </p>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={() => toggleGroupSelection(group.id)}
                      disabled={saving}
                    />
                    <Label htmlFor={`group-${group.id}`} className="cursor-pointer flex-1">
                      {group.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Lista de compartilhamentos atuais */}
          {currentShares.length > 0 && (
            <div className="space-y-2">
              <Label>Compartilhado com:</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {currentShares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-2 border rounded">
                    <Badge variant="secondary">
                      {share.shared_with_user_id && share.profiles?.full_name}
                      {share.shared_with_group_id && share.groups?.name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveShare(share.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
