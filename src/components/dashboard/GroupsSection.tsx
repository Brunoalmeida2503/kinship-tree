import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowRight, Shield } from 'lucide-react';

export function GroupsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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

    // Get current session to ensure we have the latest auth state
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar autenticado para criar um grupo',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    const groupId = crypto.randomUUID();

    const { error: groupError } = await supabase
      .from('groups')
      .insert({
        id: groupId,
        name: newGroup.name,
        description: newGroup.description,
        created_by: session.user.id
      });

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
        group_id: groupId,
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
        title: 'Clã criado!',
        description: 'Seu clã foi criado com sucesso.'
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
            Crie clãs para amigos, colegas de trabalho, turma da faculdade e mais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Novo Clã
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Clã</DialogTitle>
                <DialogDescription>
                  Dê um nome e descrição para seu clã
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Nome do Clã</Label>
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
                    placeholder="Conte sobre esse clã..."
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button onClick={createGroup} disabled={loading} className="w-full">
                  {loading ? 'Criando...' : 'Criar Clã'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus Clãs</CardTitle>
          <CardDescription>{groups.length} clãs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/group/${group.id}`)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={group.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {group.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{group.name}</h3>
                    {group.is_private && (
                      <Badge variant="secondary" className="text-xs shrink-0">Privado</Badge>
                    )}
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{group.description}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            {groups.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Você ainda não faz parte de nenhum clã. Crie o primeiro!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
