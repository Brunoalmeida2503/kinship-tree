import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Suggestion {
  person: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  suggestedRelationship: string;
  reverseRelationship: string;
  throughPerson: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  reason: string;
  degree: number;
  isPending?: boolean;
}

const relationshipLabels: Record<string, string> = {
  pai: 'Pai',
  mae: 'Mãe',
  filho: 'Filho',
  filha: 'Filha',
  irmao: 'Irmão',
  irma: 'Irmã',
  avo: 'Avô',
  ava: 'Avó',
  neto: 'Neto',
  neta: 'Neta',
  tio: 'Tio',
  tia: 'Tia',
  sobrinho: 'Sobrinho',
  sobrinha: 'Sobrinha',
  primo: 'Primo',
  prima: 'Prima',
  conjuge: 'Cônjuge',
  outro: 'Outro'
};

export default function Suggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRelationship, setFilterRelationship] = useState<string>('all');
  const [filterDegree, setFilterDegree] = useState<string>('all');

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user]);

  // Inverte a relação: se eu digo "X é meu filho", X diz "você é meu pai"
  const inverseRelationship = (rel: string): string => {
    const inverseMap: Record<string, string> = {
      'pai': 'filho',
      'mae': 'filha',
      'filho': 'pai',
      'filha': 'mae',
      'irmao': 'irmao',
      'irma': 'irma',
      'avo': 'neto',
      'ava': 'neta',
      'neto': 'avo',
      'neta': 'ava',
      'tio': 'sobrinho',
      'tia': 'sobrinha',
      'sobrinho': 'tio',
      'sobrinha': 'tia',
      'primo': 'primo',
      'prima': 'prima',
      'conjuge': 'conjuge',
      'outro': 'outro'
    };
    return inverseMap[rel] || rel;
  };

  const deduceRelationship = (middleRelToMe: string, middleRelToTarget: string) => {
    // middleRelToMe: o que a pessoa do MEIO é para MIM
    // middleRelToTarget: o que a pessoa ALVO é para a pessoa do MEIO
    const deductionMap: Record<string, Record<string, { myRel: string, theirRel: string }>> = {
      'pai': {
        'filho': { myRel: 'irmao', theirRel: 'irmao' },
        'filha': { myRel: 'irma', theirRel: 'irmao' },
        'conjuge': { myRel: 'mae', theirRel: 'filho' },
        'irmao': { myRel: 'tio', theirRel: 'sobrinho' },
        'irma': { myRel: 'tia', theirRel: 'sobrinho' },
        'pai': { myRel: 'avo', theirRel: 'neto' },
        'mae': { myRel: 'ava', theirRel: 'neto' }
      },
      'mae': {
        'filho': { myRel: 'irmao', theirRel: 'irmao' },
        'filha': { myRel: 'irma', theirRel: 'irmao' },
        'conjuge': { myRel: 'pai', theirRel: 'filho' },
        'irmao': { myRel: 'tio', theirRel: 'sobrinho' },
        'irma': { myRel: 'tia', theirRel: 'sobrinho' },
        'pai': { myRel: 'avo', theirRel: 'neto' },
        'mae': { myRel: 'ava', theirRel: 'neto' }
      },
      'filho': {
        'filho': { myRel: 'neto', theirRel: 'avo' },
        'filha': { myRel: 'neta', theirRel: 'avo' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' },
        'pai': { myRel: 'conjuge', theirRel: 'conjuge' },
        'mae': { myRel: 'conjuge', theirRel: 'conjuge' }
      },
      'filha': {
        'filho': { myRel: 'neto', theirRel: 'ava' },
        'filha': { myRel: 'neta', theirRel: 'ava' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' },
        'pai': { myRel: 'conjuge', theirRel: 'conjuge' },
        'mae': { myRel: 'conjuge', theirRel: 'conjuge' }
      },
      'irmao': {
        'filho': { myRel: 'sobrinho', theirRel: 'tio' },
        'filha': { myRel: 'sobrinha', theirRel: 'tio' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' },
        'pai': { myRel: 'pai', theirRel: 'filho' },
        'mae': { myRel: 'mae', theirRel: 'filho' }
      },
      'irma': {
        'filho': { myRel: 'sobrinho', theirRel: 'tia' },
        'filha': { myRel: 'sobrinha', theirRel: 'tia' },
        'conjuge': { myRel: 'outro', theirRel: 'outro' },
        'pai': { myRel: 'pai', theirRel: 'filha' },
        'mae': { myRel: 'mae', theirRel: 'filha' }
      },
      'tio': {
        'filho': { myRel: 'primo', theirRel: 'primo' },
        'filha': { myRel: 'prima', theirRel: 'primo' },
        'conjuge': { myRel: 'tia', theirRel: 'sobrinho' },
        'irmao': { myRel: 'pai', theirRel: 'sobrinho' },
        'irma': { myRel: 'mae', theirRel: 'sobrinho' }
      },
      'tia': {
        'filho': { myRel: 'primo', theirRel: 'primo' },
        'filha': { myRel: 'prima', theirRel: 'primo' },
        'conjuge': { myRel: 'tio', theirRel: 'sobrinha' },
        'irmao': { myRel: 'pai', theirRel: 'sobrinha' },
        'irma': { myRel: 'mae', theirRel: 'sobrinha' }
      },
      'conjuge': {
        'filho': { myRel: 'filho', theirRel: 'mae' },
        'filha': { myRel: 'filha', theirRel: 'mae' },
        'pai': { myRel: 'outro', theirRel: 'outro' },
        'mae': { myRel: 'outro', theirRel: 'outro' },
        'irmao': { myRel: 'outro', theirRel: 'outro' },
        'irma': { myRel: 'outro', theirRel: 'outro' }
      },
      'sobrinho': {
        'pai': { myRel: 'irmao', theirRel: 'filho' },
        'mae': { myRel: 'irma', theirRel: 'filho' }
      },
      'sobrinha': {
        'pai': { myRel: 'irmao', theirRel: 'filha' },
        'mae': { myRel: 'irma', theirRel: 'filha' }
      },
      'primo': {
        'pai': { myRel: 'tio', theirRel: 'sobrinho' },
        'mae': { myRel: 'tia', theirRel: 'sobrinho' }
      },
      'prima': {
        'pai': { myRel: 'tio', theirRel: 'sobrinha' },
        'mae': { myRel: 'tia', theirRel: 'sobrinha' }
      }
    };

    return deductionMap[middleRelToMe]?.[middleRelToTarget] || null;
  };

  const loadSuggestions = async () => {
    if (!user) return;

    setLoading(true);
    console.log('🔍 [SUGGESTIONS] Iniciando busca para usuário:', user.id);

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
      console.error('❌ [SUGGESTIONS] Erro ao buscar conexões:', error);
      setLoading(false);
      return;
    }

    console.log('✅ [SUGGESTIONS] Minhas conexões:', myConnections.length, myConnections);

    const suggestedConnections: Suggestion[] = [];
    const processedPairs = new Set<string>();

    // FASE 1: Verificar se minhas conexões diretas deveriam estar conectadas entre si
    console.log('🔄 [SUGGESTIONS] FASE 1: Verificando conexões diretas entre minhas conexões...');
    for (let i = 0; i < myConnections.length; i++) {
      for (let j = i + 1; j < myConnections.length; j++) {
        const conn1 = myConnections[i];
        const conn2 = myConnections[j];

        const person1Id = conn1.requester_id === user.id ? conn1.receiver_id : conn1.requester_id;
        const person1 = conn1.requester_id === user.id ? conn1.receiver : conn1.requester;
        const person1RelToMe = conn1.requester_id === user.id 
          ? conn1.relationship_from_requester 
          : conn1.relationship_from_receiver;

        const person2Id = conn2.requester_id === user.id ? conn2.receiver_id : conn2.requester_id;
        const person2 = conn2.requester_id === user.id ? conn2.receiver : conn2.requester;
        const person2RelToMe = conn2.requester_id === user.id 
          ? conn2.relationship_from_requester 
          : conn2.relationship_from_receiver;

        // Verificar se essas duas pessoas já estão conectadas
        const { data: existingConnection } = await supabase
          .from('connections')
          .select('id')
          .eq('status', 'accepted')
          .or(`and(requester_id.eq.${person1Id},receiver_id.eq.${person2Id}),and(requester_id.eq.${person2Id},receiver_id.eq.${person1Id})`)
          .single();

        if (existingConnection) {
          console.log(`   ⏭️ ${person1.full_name} e ${person2.full_name} já estão conectados`);
          continue;
        }

        // Deduzir se essas duas pessoas deveriam estar conectadas
        // Pensando do ponto de vista de person1:
        // - Eu sou ??? para person1 (inverso de person1RelToMe)
        // - person2 é ??? para mim (person2RelToMe)
        // Logo: qual é a relação de person2 para person1?
        console.log(`   🔍 Analisando: ${person1.full_name} (${person1RelToMe}) e ${person2.full_name} (${person2RelToMe})`);
        
        const myRelToPerson1 = inverseRelationship(person1RelToMe);
        const suggestedRel = deduceRelationship(myRelToPerson1, person2RelToMe);
        
        if (suggestedRel) {
          const pairKey = [person1Id, person2Id].sort().join('-');
          if (!processedPairs.has(pairKey)) {
            console.log(`   ✨ SUGESTÃO DIRETA: ${person2.full_name} deveria ser ${suggestedRel.myRel} de ${person1.full_name}`);
            processedPairs.add(pairKey);
            
            // A sugestão é para person2 se conectar com person1
            // Do ponto de vista de person1: person2 é suggestedRel.myRel
            // Do ponto de vista de person2: person1 é suggestedRel.theirRel
            suggestedConnections.push({
              person: person2,
              suggestedRelationship: suggestedRel.myRel,
              reverseRelationship: suggestedRel.theirRel,
              throughPerson: person1,
              reason: `${person1.full_name} é seu/sua ${relationshipLabels[person1RelToMe] || person1RelToMe} e ${person2.full_name} é seu/sua ${relationshipLabels[person2RelToMe] || person2RelToMe}. Logo, ${person2.full_name} deveria ser ${relationshipLabels[suggestedRel.myRel] || suggestedRel.myRel} de ${person1.full_name}`,
              degree: 1
            });
          }
        }
      }
    }

    // FASE 2: Buscar conexões de 2º grau (conexões das minhas conexões)
    console.log('🔄 [SUGGESTIONS] FASE 2: Buscando conexões de 2º grau...');
    for (const conn of myConnections) {
      const otherId = conn.requester_id === user.id ? conn.receiver_id : conn.requester_id;
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const otherRelToMe = conn.requester_id === user.id 
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;
      
      console.log(`👤 [SUGGESTIONS] Analisando conexões de ${otherPerson.full_name} (${otherRelToMe})`);

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

      for (const theirConn of theirConnections) {
        const suggestedId = theirConn.requester_id === otherId ? theirConn.receiver_id : theirConn.requester_id;
        
        if (suggestedId === user.id) continue;
        
        const pairKey = [user.id, suggestedId].sort().join('-');
        if (processedPairs.has(pairKey)) continue;

        const existingConn = myConnections.find(c => 
          (c.requester_id === suggestedId || c.receiver_id === suggestedId)
        );
        if (existingConn) continue;

        const suggestedPerson = theirConn.requester_id === otherId ? theirConn.receiver : theirConn.requester;
        const theirRelToSuggested = theirConn.requester_id === otherId
          ? theirConn.relationship_from_requester
          : theirConn.relationship_from_receiver;

        const suggestedRel = deduceRelationship(otherRelToMe, theirRelToSuggested);
        
        if (suggestedRel) {
          console.log(`   ✨ SUGESTÃO 2º GRAU: ${suggestedPerson.full_name} é ${suggestedRel.myRel}`);
          processedPairs.add(pairKey);
          suggestedConnections.push({
            person: suggestedPerson,
            suggestedRelationship: suggestedRel.myRel,
            reverseRelationship: suggestedRel.theirRel,
            throughPerson: otherPerson,
            reason: `${otherPerson.full_name} é seu/sua ${relationshipLabels[otherRelToMe] || otherRelToMe} e ${suggestedPerson.full_name} é ${relationshipLabels[theirRelToSuggested] || theirRelToSuggested} de ${otherPerson.full_name}`,
            degree: 2
          });
        }
      }
    }

    console.log(`🎯 [SUGGESTIONS] Total de sugestões: ${suggestedConnections.length}`, suggestedConnections);
    setSuggestions(suggestedConnections);
    setLoading(false);
  };

  const sendConnectionRequest = async (suggestion: Suggestion) => {
    if (!user) return;

    const { error } = await supabase
      .from('connections')
      .insert({
        requester_id: user.id,
        receiver_id: suggestion.person.id,
        relationship_from_requester: suggestion.suggestedRelationship as any,
        relationship_from_receiver: suggestion.reverseRelationship as any,
        connection_type: 'family',
        status: 'pending' as any
      });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a solicitação',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Solicitação enviada!',
        description: `Solicitação de conexão enviada para ${suggestion.person.full_name}`
      });
      
      setSuggestions(suggestions.filter(s => s.person.id !== suggestion.person.id));
    }
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (filterRelationship !== 'all' && s.suggestedRelationship !== filterRelationship) {
      return false;
    }
    if (filterDegree !== 'all' && s.degree.toString() !== filterDegree) {
      return false;
    }
    return true;
  });

  const uniqueRelationships = Array.from(new Set(suggestions.map(s => s.suggestedRelationship)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-start to-background-end">
      <header className="border-b border-border-subtle bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Sugestões de Conexões
              </h1>
              <p className="text-sm text-muted-foreground">
                Descubra novos membros da família através de suas conexões
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Refine suas sugestões por tipo de relacionamento ou grau de separação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Relacionamento</label>
                <Select value={filterRelationship} onValueChange={setFilterRelationship}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os relacionamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os relacionamentos</SelectItem>
                    {uniqueRelationships.map(rel => (
                      <SelectItem key={rel} value={rel}>
                        {relationshipLabels[rel] || rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Grau de Separação</label>
                <Select value={filterDegree} onValueChange={setFilterDegree}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os graus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os graus</SelectItem>
                    <SelectItem value="1">1º grau (direto)</SelectItem>
                    <SelectItem value="2">2º grau (através de 1 pessoa)</SelectItem>
                    <SelectItem value="3">3º grau (através de 2 pessoas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary">
                {filteredSuggestions.length} sugestão(ões) encontrada(s)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Carregando sugestões...</p>
            </CardContent>
          </Card>
        ) : filteredSuggestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma sugestão encontrada</h3>
              <p className="text-muted-foreground">
                {suggestions.length === 0
                  ? 'Adicione mais conexões para receber sugestões de novos membros da família'
                  : 'Tente ajustar os filtros para ver mais sugestões'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredSuggestions.map((suggestion, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={suggestion.person.avatar_url} />
                        <AvatarFallback>
                          {suggestion.person.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1">
                          {suggestion.person.full_name}
                        </h3>
                        <Badge className="mb-3">
                          {relationshipLabels[suggestion.suggestedRelationship] || suggestion.suggestedRelationship}
                        </Badge>
                        
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Como descobrimos:</span>
                          </div>
                          
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">Você</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">Você</span>
                            </div>
                            
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={suggestion.throughPerson.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {suggestion.throughPerson.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{suggestion.throughPerson.full_name}</span>
                            </div>
                            
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={suggestion.person.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {suggestion.person.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{suggestion.person.full_name}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {suggestion.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center md:items-start">
                      <Button 
                        onClick={() => sendConnectionRequest(suggestion)}
                        className="w-full md:w-auto"
                      >
                        Enviar Solicitação
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
