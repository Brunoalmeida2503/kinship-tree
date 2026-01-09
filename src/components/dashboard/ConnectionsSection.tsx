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
  { value: 'sogro', label: 'Sogro' },
  { value: 'sogra', label: 'Sogra' },
  { value: 'cunhado', label: 'Cunhado' },
  { value: 'cunhada', label: 'Cunhada' },
  { value: 'ancestral', label: 'Ancestral' },
  { value: 'outro', label: 'Outro' }
];

const friendRelationshipTypes = [
  { value: 'amigo', label: 'Amigo' },
  { value: 'amiga', label: 'Amiga' },
  { value: 'colega', label: 'Colega' }
];

// Mapeamento de relacionamentos reversos automáticos
const reverseRelationshipMap: Record<string, string[]> = {
  'pai': ['filho', 'filha'],
  'mae': ['filho', 'filha'],
  'filho': ['pai', 'mae'],
  'filha': ['pai', 'mae'],
  'irmao': ['irmao', 'irma'],
  'irma': ['irmao', 'irma'],
  'avo': ['neto', 'neta'],
  'avó': ['neto', 'neta'],
  'neto': ['avo', 'avó'],
  'neta': ['avo', 'avó'],
  'tio': ['sobrinho', 'sobrinha'],
  'tia': ['sobrinho', 'sobrinha'],
  'sobrinho': ['tio', 'tia'],
  'sobrinha': ['tio', 'tia'],
  'primo': ['primo', 'prima'],
  'prima': ['primo', 'prima'],
  'conjuge': ['conjuge'],
  'sogro': ['nora', 'genro'],
  'sogra': ['nora', 'genro'],
  'cunhado': ['cunhado', 'cunhada'],
  'cunhada': ['cunhado', 'cunhada'],
  'amigo': ['amigo', 'amiga'],
  'amiga': ['amigo', 'amiga'],
  'colega': ['colega']
};

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
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadConnections();
      loadPendingRequests();
      loadSuggestions();
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

  const loadSuggestions = async () => {
    if (!user) return;

    console.log('🔍 Carregando sugestões de conexões...');

    // Buscar todas as conexões aceitas do usuário
    const { data: myConnections, error } = await supabase
      .from('connections')
      .select(`
        *,
        requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
        receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error || !myConnections) {
      console.log('❌ Erro ao buscar conexões:', error);
      return;
    }

    console.log('✅ Minhas conexões encontradas:', myConnections.length);

    const suggestedConnections: any[] = [];
    const processedPairs = new Set<string>();

    // Para cada conexão minha
    for (const conn of myConnections) {
      const otherId = conn.requester_id === user.id ? conn.receiver_id : conn.requester_id;
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const myRelToOther = conn.requester_id === user.id 
        ? conn.relationship_from_requester 
        : conn.relationship_from_receiver;

      // Buscar conexões dessa pessoa
      const { data: theirConnections } = await supabase
        .from('connections')
        .select(`
          *,
          requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
          receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${otherId},receiver_id.eq.${otherId}`);

      if (!theirConnections) continue;

      // Analisar cada conexão deles
      for (const theirConn of theirConnections) {
        const suggestedId = theirConn.requester_id === otherId ? theirConn.receiver_id : theirConn.requester_id;
        
        // Evitar sugerir eu mesmo ou conexões já existentes
        if (suggestedId === user.id) continue;
        
        const pairKey = [user.id, suggestedId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;

        // Verificar se já existe conexão
        const existingConn = myConnections.find(c => 
          (c.requester_id === suggestedId || c.receiver_id === suggestedId)
        );
        if (existingConn) continue;

        const suggestedPerson = theirConn.requester_id === otherId ? theirConn.receiver : theirConn.requester;
        const theirRelToSuggested = theirConn.requester_id === otherId
          ? theirConn.relationship_from_requester
          : theirConn.relationship_from_receiver;

        // Deduzir relacionamento baseado na lógica familiar
        const suggestedRel = deduceRelationship(myRelToOther, theirRelToSuggested);
        
        if (suggestedRel) {
          processedPairs.add(pairKey);
          suggestedConnections.push({
            person: suggestedPerson,
            suggestedRelationship: suggestedRel.myRel,
            reverseRelationship: suggestedRel.theirRel,
            throughPerson: otherPerson,
            reason: `${otherPerson.full_name} é seu/sua ${myRelToOther} e ${suggestedPerson.full_name} é ${theirRelToSuggested} de ${otherPerson.full_name}`
          });
        }
      }
    }

    console.log('💡 Total de sugestões encontradas:', suggestedConnections.length);
    console.log('Sugestões:', suggestedConnections);
    setSuggestions(suggestedConnections);
  };

  const deduceRelationship = (myRelToMiddle: string, middleRelToTarget: string) => {
    // Mapeamento de relacionamentos deduzidos
    const deductionMap: Record<string, Record<string, { myRel: string, theirRel: string }>> = {
      // Se X é meu pai/mãe e Y é filho/filha de X, então Y é meu irmão/irmã
      'pai': {
        'filho': { myRel: 'irmao', theirRel: 'irmao' },
        'filha': { myRel: 'irma', theirRel: 'irmao' },
        'conjuge': { myRel: 'mae', theirRel: 'filho' }
      },
      'mae': {
        'filho': { myRel: 'irmao', theirRel: 'irmao' },
        'filha': { myRel: 'irma', theirRel: 'irmao' },
        'conjuge': { myRel: 'pai', theirRel: 'filho' }
      },
      // Se X é meu filho/filha e Y é filho/filha de X, então Y é meu neto/neta
      'filho': {
        'filho': { myRel: 'neto', theirRel: 'avo' },
        'filha': { myRel: 'neta', theirRel: 'avo' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' }
      },
      'filha': {
        'filho': { myRel: 'neto', theirRel: 'avo' },
        'filha': { myRel: 'neta', theirRel: 'avo' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' }
      },
      // Se X é meu irmão/irmã e Y é filho/filha de X, então Y é meu sobrinho/sobrinha
      'irmao': {
        'filho': { myRel: 'sobrinho', theirRel: 'tio' },
        'filha': { myRel: 'sobrinha', theirRel: 'tio' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' }
      },
      'irma': {
        'filho': { myRel: 'sobrinho', theirRel: 'tia' },
        'filha': { myRel: 'sobrinha', theirRel: 'tia' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' }
      },
      // Se X é meu tio/tia e Y é filho/filha de X, então Y é meu primo/prima
      'tio': {
        'filho': { myRel: 'primo', theirRel: 'primo' },
        'filha': { myRel: 'prima', theirRel: 'primo' }
      },
      'tia': {
        'filho': { myRel: 'primo', theirRel: 'primo' },
        'filha': { myRel: 'prima', theirRel: 'primo' }
      },
      // Se X é meu cônjuge e Y é pai/mãe de X, então Y é meu sogro/sogra
      'conjuge': {
        'pai': { myRel: 'sogro', theirRel: 'genro' },
        'mae': { myRel: 'sogra', theirRel: 'nora' },
        'irmao': { myRel: 'cunhado', theirRel: 'cunhado' },
        'irma': { myRel: 'cunhada', theirRel: 'cunhado' }
      }
    };

    return deductionMap[myRelToMiddle]?.[middleRelToTarget] || null;
  };

  const sendSuggestionRequest = async (suggestion: any) => {
    if (!user) return;

    const { error } = await supabase
      .from('connections')
      .insert([{
        requester_id: user.id,
        receiver_id: suggestion.person.id,
        relationship_from_requester: suggestion.suggestedRelationship,
        relationship_from_receiver: suggestion.reverseRelationship,
        is_ancestor: false,
        ancestor_confirmed_by: null,
        connection_type: 'family'
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
        description: `Solicitação enviada para ${suggestion.person.full_name}.`
      });
      loadSuggestions();
    }
  };

  const handleRelationshipChange = (value: string) => {
    setRelationship(value);
    
    // Definir automaticamente o relacionamento reverso
    const reverseOptions = reverseRelationshipMap[value];
    if (reverseOptions && reverseOptions.length > 0) {
      setTheirRelationship(reverseOptions[0]);
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
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => openDialog('family')} className="w-full sm:w-auto text-sm sm:text-base">Adicionar Familiar</Button>
            <Button variant="outline" onClick={() => openDialog('friend')} className="w-full sm:w-auto text-sm sm:text-base">Adicionar Amigo</Button>
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
                      <Select value={relationship} onValueChange={handleRelationshipChange}>
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

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sugestões de Conexões Familiares
            </CardTitle>
            <CardDescription>
              Baseado em suas conexões existentes, estas pessoas podem ter laço familiar com você
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{suggestion.person.full_name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        Possível {suggestion.suggestedRelationship}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.reason}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => sendSuggestionRequest(suggestion)}
                      className="shrink-0"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Conectar
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
