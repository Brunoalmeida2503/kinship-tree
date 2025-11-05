import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Lock, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Group {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  member_count?: number;
}

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      // Buscar grupos que o usuário é membro
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const groupIds = memberGroups?.map(gm => gm.group_id) || [];

      if (groupIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // Buscar informações dos grupos
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds)
        .order('name', { ascending: true });

      if (groupsError) throw groupsError;

      // Buscar contagem de membros para cada grupo
      const groupsWithStats = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          return {
            ...group,
            member_count: count || 0,
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">{t('groups.loading')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">{t('groups.title')}</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t('groups.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
              {t('groups.noGroups')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {groups.map((group) => (
                <Card 
                  key={group.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/group/${group.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={group.avatar_url || undefined} />
                        <AvatarFallback className="text-2xl">{group.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <h3 className="font-semibold text-lg text-foreground truncate">
                            {group.name}
                          </h3>
                          {group.is_private ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        {group.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {group.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{group.member_count} {t('groups.members')}</span>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/group/${group.id}`);
                        }}
                      >
                        {t('groups.viewGroup')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Groups;
