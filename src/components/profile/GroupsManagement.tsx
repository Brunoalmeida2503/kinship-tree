import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Eye, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GroupSettings } from '@/components/groups/GroupSettings';

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
  member_count?: number;
  pending_requests?: number;
}

interface JoinRequest {
  id: string;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function GroupsManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [requests, setRequests] = useState<{ [groupId: string]: JoinRequest[] }>({});
  const [showRequests, setShowRequests] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      const { data: groupsData, error } = await supabase
        .from('groups')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch member count and pending requests for each group
      const groupsWithStats = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          const { count: pendingCount } = await supabase
            .from('group_join_requests')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .eq('status', 'pending');

          return {
            ...group,
            member_count: memberCount || 0,
            pending_requests: pendingCount || 0,
          };
        })
      );

      setGroups(groupsWithStats);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupRequests = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_join_requests')
        .select(`
          id,
          user_id,
          created_at,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRequests({ ...requests, [groupId]: data || [] });
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erro ao carregar solicitações');
    }
  };

  const handleApproveRequest = async (groupId: string, requestId: string, userId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('group_join_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId
        });

      if (memberError) throw memberError;

      toast.success('Solicitação aprovada');
      fetchGroupRequests(groupId);
      fetchGroups();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erro ao aprovar solicitação');
    }
  };

  const handleRejectRequest = async (groupId: string, requestId: string) => {
    try {
      const { error } = await supabase
        .from('group_join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Solicitação rejeitada');
      fetchGroupRequests(groupId);
      fetchGroups();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erro ao rejeitar solicitação');
    }
  };

  const toggleRequests = (groupId: string) => {
    if (showRequests === groupId) {
      setShowRequests(null);
    } else {
      setShowRequests(groupId);
      if (!requests[groupId]) {
        fetchGroupRequests(groupId);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Carregando grupos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Meus Grupos</CardTitle>
          <CardDescription>
            Gerencie os grupos que você criou
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Você ainda não criou nenhum grupo
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={group.avatar_url || undefined} />
                      <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {group.name}
                        </h3>
                        <Badge variant={group.is_private ? 'secondary' : 'outline'}>
                          {group.is_private ? 'Privado' : 'Público'}
                        </Badge>
                      </div>
                      
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {group.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {group.member_count} membros
                        </span>
                        {group.is_private && group.pending_requests! > 0 && (
                          <span className="flex items-center gap-1 text-primary">
                            <Clock className="h-4 w-4" />
                            {group.pending_requests} pendentes
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/group/${group.id}`)}
                        title="Ver grupo"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedGroup(group);
                          setSettingsOpen(true);
                        }}
                        title="Configurações"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {group.is_private && group.pending_requests! > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRequests(group.id)}
                        >
                          {showRequests === group.id ? 'Ocultar' : 'Ver'} Solicitações
                        </Button>
                      )}
                    </div>
                  </div>

                  {showRequests === group.id && requests[group.id] && (
                    <div className="ml-16 space-y-2">
                      {requests[group.id].map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={request.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                {request.profiles?.full_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm text-foreground">
                              {request.profiles?.full_name || 'Usuário'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveRequest(group.id, request.id, request.user_id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRequest(group.id, request.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurações do Grupo</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <GroupSettings
              group={selectedGroup}
              onUpdate={() => {
                fetchGroups();
                setSettingsOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
