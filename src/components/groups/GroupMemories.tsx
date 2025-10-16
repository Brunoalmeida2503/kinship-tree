import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { AddGroupMemoryDialog } from './AddGroupMemoryDialog';
import { GroupMemoryCard } from './GroupMemoryCard';

interface GroupMemory {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  group_memory_media: Array<{
    id: string;
    media_url: string;
    media_type: string;
    display_order: number;
  }>;
}

interface GroupMemoriesProps {
  groupId: string;
}

export function GroupMemories({ groupId }: GroupMemoriesProps) {
  const { user } = useAuth();
  const [memories, setMemories] = useState<GroupMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchMemories();
  }, [groupId]);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('group_memories')
        .select('*')
        .eq('group_id', groupId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const memoriesWithDetails = await Promise.all(
        (data || []).map(async (memory) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', memory.user_id)
            .single();

          const { data: media } = await supabase
            .from('group_memory_media')
            .select('*')
            .eq('group_memory_id', memory.id);

          return {
            ...memory,
            profiles: profile || { full_name: 'Usuário', avatar_url: null },
            group_memory_media: media || [],
          };
        })
      );

      setMemories(memoriesWithDetails);
    } catch (error) {
      console.error('Error fetching group memories:', error);
      toast.error('Erro ao carregar memórias do grupo');
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryAdded = () => {
    fetchMemories();
    setShowAddDialog(false);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando memórias...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Memórias do Grupo</CardTitle>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Memória
          </Button>
        </CardHeader>
        <CardContent>
          {memories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma memória compartilhada ainda
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {memories.map((memory) => (
                <GroupMemoryCard
                  key={memory.id}
                  memory={memory}
                  onUpdate={fetchMemories}
                  canEdit={memory.user_id === user?.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddGroupMemoryDialog
        groupId={groupId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onMemoryAdded={handleMemoryAdded}
      />
    </div>
  );
}
