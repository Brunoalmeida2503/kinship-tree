import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, Settings, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { GroupFeed } from '@/components/groups/GroupFeed';
import { GroupMembers } from '@/components/groups/GroupMembers';
import { GroupSettings } from '@/components/groups/GroupSettings';
import { GroupMemories } from '@/components/groups/GroupMemories';

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  is_private: boolean;
}

export default function Group() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (groupId && user) {
      fetchGroupData();
    }
  }, [groupId, user]);

  const fetchGroupData = async () => {
    if (!groupId || !user) return;

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);
      setIsAdmin(groupData.created_by === user.id);

      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') throw memberError;
      setIsMember(!!memberData);
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Erro ao carregar grupo');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!groupId || !user) return;

    try {
      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: groupId,
          user_id: user.id,
          status: 'pending'
        });

      if (error) throw error;
      toast.success('Solicitação enviada');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Você já solicitou entrar neste grupo');
      } else {
        console.error('Error requesting to join:', error);
        toast.error('Erro ao solicitar entrada');
      }
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!group || !user) return null;

  if (!isMember && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background p-8">
        <div className="container mx-auto max-w-2xl">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={group.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">{group.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{group.name}</CardTitle>
              {group.description && (
                <p className="text-muted-foreground mt-2">{group.description}</p>
              )}
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Você precisa ser membro para visualizar este grupo
              </p>
              <Button onClick={handleJoinRequest} size="lg">
                <UserPlus className="mr-2 h-5 w-5" />
                Solicitar Entrada
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={group.avatar_url || undefined} />
              <AvatarFallback className="text-xl">{group.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{group.name}</h1>
              {group.description && (
                <p className="text-muted-foreground">{group.description}</p>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="memories">Memórias</TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Membros
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Config
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="feed">
            <GroupFeed groupId={groupId!} />
          </TabsContent>

          <TabsContent value="memories">
            <GroupMemories groupId={groupId!} />
          </TabsContent>

          <TabsContent value="members">
            <GroupMembers groupId={groupId!} isAdmin={isAdmin} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings">
              <GroupSettings group={group} onUpdate={fetchGroupData} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}