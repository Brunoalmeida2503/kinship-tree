import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Check, X, Users, Heart, Globe } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const relationshipTypes = [
  { value: 'pai', label: 'Pai' },
  { value: 'mae', label: 'Mãe' },
  { value: 'filho', label: 'Filho' },
  { value: 'filha', label: 'Filha' },
  { value: 'irmao', label: 'Irmão' },
  { value: 'irma', label: 'Irmã' },
  { value: 'avo', label: 'Avô' },
  { value: 'avó', label: 'Avó' },
  { value: 'neto', label: 'Neto' },
  { value: 'neta', label: 'Neta' },
  { value: 'tio', label: 'Tio' },
  { value: 'tia', label: 'Tia' },
  { value: 'sobrinho', label: 'Sobrinho' },
  { value: 'sobrinha', label: 'Sobrinha' },
  { value: 'primo', label: 'Primo' },
  { value: 'prima', label: 'Prima' },
  { value: 'conjuge', label: 'Cônjuge' },
  { value: 'ancestral', label: 'Ancestral' },
  { value: 'outro', label: 'Outro' }
];

const friendRelationshipTypes = [
  { value: 'amigo', label: 'Amigo' },
  { value: 'amiga', label: 'Amiga' },
  { value: 'colega', label: 'Colega' }
];

export function ConnectionsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [relationship, setRelationship] = useState('');
  const [theirRelationship, setTheirRelationship] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionType, setConnectionType] = useState<'family' | 'friend'>('family');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'family' | 'friend'>('all');

  useEffect(() => {
    if (user) {
      loadConnections();
      loadPendingRequests();
    }
  }, [user]);

  const loadConnections = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:requester_id(id, full_name, avatar_url),
        receiver:receiver_id(id, full_name, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!error && data) {
      setConnections(data);
    }
  };

  const loadPendingRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:requester_id(id, full_name, avatar_url)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (!error && data) {
      setPendingRequests(data);
    }
  };

  const searchUser = async () => {
    if (!searchEmail) return;

    setLoading(true);
    
    // Search by checking if user exists with email in auth metadata
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*, id')
      .limit(100);

    if (error || !profiles) {
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível buscar usuários.',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    // For now, just search by name similarity since we can't directly query by email
    // In a production app, you'd want to implement a proper search function
    const found = profiles.find(p => 
      p.full_name.toLowerCase().includes(searchEmail.toLowerCase())
    );

    if (!found) {
      toast({
        title: 'Usuário não encontrado',
        description: 'Busque pelo nome da pessoa.',
        variant: 'destructive'
      });
    } else {
      setSelectedUser(found);
    }
    setLoading(false);
  };

  const sendRequest = async () => {
    if (!user || !selectedUser || !relationship || !theirRelationship) return;

    const isAncestor = relationship === 'ancestral' || theirRelationship === 'ancestral';

    const { error } = await supabase
      .from('connections')
      .insert([{
        requester_id: user.id,
        receiver_id: selectedUser.id,
        relationship_from_requester: relationship as any,
        relationship_from_receiver: theirRelationship as any,
        is_ancestor: isAncestor,
        ancestor_confirmed_by: isAncestor ? [] : null,
        connection_type: connectionType
      }]);

    if (error) {
      toast({
        title: 'Erro ao enviar solicitação',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Solicitação enviada!',
        description: isAncestor 
          ? `Solicitação de ancestral enviada para ${selectedUser.full_name}. Seus parentes diretos precisarão confirmar.`
          : connectionType === 'friend'
          ? `Solicitação de amizade enviada para ${selectedUser.full_name}!`
          : `${selectedUser.full_name} receberá sua solicitação.`
      });
      setSelectedUser(null);
      setSearchEmail('');
      setRelationship('');
      setTheirRelationship('');
      setIsDialogOpen(false);
    }
  };

  const openDialog = (type: 'family' | 'friend') => {
    setConnectionType(type);
    setIsDialogOpen(true);
    setSelectedUser(null);
    setSearchEmail('');
    setRelationship('');
    setTheirRelationship('');
  };

  const handleRequest = async (connectionId: string, accept: boolean) => {
    const { error } = await supabase
      .from('connections')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', connectionId);

    if (!error) {
      toast({
        title: accept ? 'Conexão aceita!' : 'Conexão recusada',
        description: accept ? 'Vocês agora estão conectados.' : 'A solicitação foi recusada.'
      });
      loadConnections();
      loadPendingRequests();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nova Conexão
          </CardTitle>
          <CardDescription>Adicione familiares ou amigos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => openDialog('family')}>Adicionar Familiar</Button>
            <Button variant="outline" onClick={() => openDialog('friend')}>Adicionar Amigo</Button>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {connectionType === 'family' ? 'Adicionar Familiar' : 'Adicionar Amigo'}
                </DialogTitle>
                <DialogDescription>
                  {connectionType === 'family' 
                    ? 'Busque a pessoa pelo nome e defina o grau de parentesco'
                    : 'Busque a pessoa pelo nome para adicionar como amigo'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da pessoa"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />
                  <Button onClick={searchUser} disabled={loading}>
                    Buscar
                  </Button>
                </div>

                {selectedUser && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <p className="font-medium">{selectedUser.full_name}</p>
                    
                    <div className="space-y-2">
                      <Label>
                        {connectionType === 'family' 
                          ? 'Essa pessoa é meu/minha:' 
                          : 'Tipo de amizade:'}
                      </Label>
                      <Select value={relationship} onValueChange={setRelationship}>
                        <SelectTrigger>
                          <SelectValue placeholder={connectionType === 'family' ? 'Selecione o parentesco' : 'Selecione o tipo'} />
                        </SelectTrigger>
                        <SelectContent>
                          {(connectionType === 'family' ? relationshipTypes : friendRelationshipTypes).map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        {connectionType === 'family'
                          ? `Eu sou o/a ${relationship || '...'} dessa pessoa, então eu sou:`
                          : 'Para essa pessoa, eu sou:'}
                      </Label>
                      <Select value={theirRelationship} onValueChange={setTheirRelationship}>
                        <SelectTrigger>
                          <SelectValue placeholder={connectionType === 'family' ? 'Selecione seu parentesco' : 'Selecione o tipo'} />
                        </SelectTrigger>
                        <SelectContent>
                          {(connectionType === 'family' ? relationshipTypes : friendRelationshipTypes).map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button onClick={sendRequest} className="w-full">
                      Enviar Solicitação
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitações Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.requester.full_name}</p>
                      {request.connection_type === 'friend' ? (
                        <Heart className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.connection_type === 'friend'
                        ? 'Quer ser seu amigo(a)'
                        : `Quer ser seu/sua ${request.relationship_from_receiver}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRequest(request.id, true)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRequest(request.id, false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Minhas Conexões</CardTitle>
          <CardDescription>
            {connections.filter(c => filterType === 'all' || c.connection_type === filterType).length} conexões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Todas
                </TabsTrigger>
                <TabsTrigger value="family" className="gap-2">
                  <Users className="h-4 w-4" />
                  Família
                </TabsTrigger>
                <TabsTrigger value="friend" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Amigos
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {connections
              .filter(c => filterType === 'all' || c.connection_type === filterType)
              .map((connection) => {
              const otherPerson = connection.requester_id === user?.id 
                ? connection.receiver 
                : connection.requester;
              const relationship = connection.requester_id === user?.id
                ? connection.relationship_from_requester
                : connection.relationship_from_receiver;

              return (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{otherPerson.full_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{relationship}</p>
                  </div>
                </div>
              );
            })}
            {connections.filter(c => filterType === 'all' || c.connection_type === filterType).length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                {filterType === 'all' 
                  ? 'Você ainda não tem conexões. Comece adicionando familiares ou amigos!'
                  : filterType === 'family'
                  ? 'Você ainda não tem conexões familiares.'
                  : 'Você ainda não tem amigos adicionados.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
