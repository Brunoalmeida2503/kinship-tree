import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus } from 'lucide-react';

export function GroupsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        *,
        group:groups(*)
      `)
      .eq('user_id', user.id);

    if (!error && data) {
      setGroups(data.map(item => item.group));
    }
  };

  const createGroup = async () => {
    if (!user || !newGroup.name) return;

    setLoading(true);

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: newGroup.name,
        description: newGroup.description,
        created_by: user.id
      })
      .select()
      .single();

    if (groupError) {
      toast({
        title: 'Erro ao criar grupo',
        description: groupError.message,
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupData.id,
        user_id: user.id
      });

    if (memberError) {
      toast({
        title: 'Erro ao adicionar membro',
        description: memberError.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Grupo criado!',
        description: 'Seu grupo foi criado com sucesso.'
      });
      setNewGroup({ name: '', description: '' });
      loadGroups();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Famílias que a Vida Uniu
          </CardTitle>
          <CardDescription>
            Crie grupos para amigos, colegas de trabalho, turma da faculdade e mais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
                <DialogDescription>
                  Dê um nome e descrição para seu grupo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Nome do Grupo</Label>
                  <Input
                    id="groupName"
                    placeholder="Ex: Turma Engenharia 2020"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Descrição</Label>
                  <Textarea
                    id="groupDescription"
                    placeholder="Conte sobre esse grupo..."
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button onClick={createGroup} disabled={loading} className="w-full">
                  {loading ? 'Criando...' : 'Criar Grupo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus Grupos</CardTitle>
          <CardDescription>{groups.length} grupos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} className="p-4 border rounded-lg">
                <h3 className="font-semibold">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                )}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Você ainda não faz parte de nenhum grupo. Crie o primeiro!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
