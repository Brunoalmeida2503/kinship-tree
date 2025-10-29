import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, X, Search, Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface SharePostDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

interface Share {
  id: string;
  shared_with_user_id: string;
  shared_with_user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function SharePostDialog({ postId, open, onOpenChange }: SharePostDialogProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [shareWithTree, setShareWithTree] = useState(false);
  const [currentShares, setCurrentShares] = useState<Share[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, postId]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch current post to check share_with_tree
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('share_with_tree')
        .eq('id', postId)
        .single();

      if (postError) throw postError;
      setShareWithTree(postData?.share_with_tree || false);

      // Fetch connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('requester_id, receiver_id')
        .eq('status', 'accepted');

      if (connectionsError) throw connectionsError;

      // Get connected user IDs
      const connectedUserIds = new Set<string>();
      connectionsData?.forEach((conn) => {
        if (conn.requester_id === user.id) {
          connectedUserIds.add(conn.receiver_id);
        } else if (conn.receiver_id === user.id) {
          connectedUserIds.add(conn.requester_id);
        }
      });

      // Fetch profiles for connections
      if (connectedUserIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(connectedUserIds));

        if (profilesError) throw profilesError;
        setConnections(profilesData || []);
      }

      // Fetch user's groups
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membersError) throw membersError;

      const groupIds = groupMembers?.map(gm => gm.group_id) || [];
      
      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('id, name, avatar_url')
          .in('id', groupIds);

        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Fetch current group shares
        const { data: postGroups, error: pgError } = await supabase
          .from('post_groups')
          .select('group_id')
          .eq('post_id', postId);

        if (pgError) throw pgError;
        setSelectedGroups(postGroups?.map(pg => pg.group_id) || []);
      }

      // Fetch current shares
      const { data: sharesData, error: sharesError } = await supabase
        .from('post_shares')
        .select('id, shared_with_user_id')
        .eq('post_id', postId);

      if (sharesError) throw sharesError;

      // Fetch profiles for shares
      if (sharesData && sharesData.length > 0) {
        const userIds = sharesData.map(s => s.shared_with_user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        const enrichedShares = sharesData.map(share => ({
          ...share,
          shared_with_user: profilesData?.find(p => p.id === share.shared_with_user_id)
        }));

        setCurrentShares(enrichedShares);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('post_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;

      toast.success('Compartilhamento removido');
      loadData();
    } catch (error) {
      console.error('Error removing share:', error);
      toast.error('Erro ao remover compartilhamento');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update share_with_tree
      const { error: updateError } = await supabase
        .from('posts')
        .update({ share_with_tree: shareWithTree })
        .eq('id', postId);

      if (updateError) throw updateError;

      // Share with selected users
      if (selectedUsers.length > 0) {
        const sharesData = selectedUsers.map(userId => ({
          post_id: postId,
          shared_by: user.id,
          shared_with_user_id: userId
        }));

        const { error: sharesError } = await supabase
          .from('post_shares')
          .insert(sharesData);

        if (sharesError) throw sharesError;
      }

      // Update group shares
      // First, remove all existing group shares
      const { error: deleteError } = await supabase
        .from('post_groups')
        .delete()
        .eq('post_id', postId);

      if (deleteError) throw deleteError;

      // Then add new ones
      if (selectedGroups.length > 0) {
        const groupsData = selectedGroups.map(groupId => ({
          post_id: postId,
          group_id: groupId
        }));

        const { error: groupsError } = await supabase
          .from('post_groups')
          .insert(groupsData);

        if (groupsError) throw groupsError;
      }

      toast.success('Configurações de compartilhamento atualizadas');
      setSelectedUsers([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating sharing:', error);
      toast.error('Erro ao atualizar compartilhamento');
    } finally {
      setSaving(false);
    }
  };

  const filteredConnections = connections.filter(conn =>
    conn.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compartilhar Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar conexões ou grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Share with tree */}
          <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="share-tree"
              checked={shareWithTree}
              onCheckedChange={(checked) => setShareWithTree(checked as boolean)}
            />
            <Label htmlFor="share-tree" className="flex items-center gap-2 cursor-pointer">
              <Users className="h-4 w-4" />
              Compartilhar com toda a árvore
            </Label>
          </div>

          <Tabs defaultValue="connections" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connections">
                <Users className="h-4 w-4 mr-2" />
                Conexões ({selectedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="groups">
                <UserPlus className="h-4 w-4 mr-2" />
                Grupos ({selectedGroups.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="connections" className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredConnections.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? 'Nenhuma conexão encontrada' : 'Você ainda não tem conexões'}
                  </p>
                ) : (
                  filteredConnections.map((connection) => {
                    const isAlreadyShared = currentShares.some(
                      share => share.shared_with_user_id === connection.id
                    );
                    
                    return (
                      <div
                        key={connection.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent"
                      >
                        <Checkbox
                          id={`share-${connection.id}`}
                          checked={selectedUsers.includes(connection.id)}
                          onCheckedChange={() => toggleUserSelection(connection.id)}
                          disabled={isAlreadyShared}
                        />
                        <label
                          htmlFor={`share-${connection.id}`}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={connection.avatar_url || undefined} />
                            <AvatarFallback>
                              {connection.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm flex-1">{connection.full_name}</span>
                          {isAlreadyShared && (
                            <Badge variant="secondary" className="text-xs">
                              Compartilhado
                            </Badge>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchTerm ? 'Nenhum grupo encontrado' : 'Você ainda não participa de grupos'}
                  </p>
                ) : (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent"
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, group.id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={group.avatar_url || undefined} />
                          <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{group.name}</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Shared with users */}
          {currentShares.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Compartilhado diretamente com</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {currentShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={share.shared_with_user?.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {share.shared_with_user?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {share.shared_with_user?.full_name || 'Usuário'}
                      </span>
                    </div>
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

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar configurações'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
