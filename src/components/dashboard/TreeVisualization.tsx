import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  relationship: string;
  avatar_url?: string;
  children: TreeNode[];
  spouse?: TreeNode;
  x?: number;
  y?: number;
  generation?: number; // -2=avós, -1=pais/mesma geração, 0=usuário/irmãos, 1=filhos, 2=netos
  isRoot?: boolean;
}

export function TreeVisualization() {
  const { user } = useAuth();
  const [treeData, setTreeData] = useState<{
    generations: Map<number, TreeNode[]>;
    root: TreeNode;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  const loadConnections = async () => {
    if (!user) return;

    const { data: connections, error } = await supabase
      .from('connections')
      .select('*')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      console.error('Error loading connections:', error);
      return;
    }

    if (!connections || connections.length === 0) {
      console.log('No connections found');
      setTreeData(null);
      return;
    }

    // Buscar perfis de todas as pessoas conectadas
    const profileIds = new Set<string>();
    connections.forEach(conn => {
      profileIds.add(conn.requester_id);
      profileIds.add(conn.receiver_id);
    });

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(profileIds));

    if (profilesError) {
      console.error('Error loading profiles:', profilesError);
      return;
    }

    // Criar mapa de perfis
    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Adicionar perfis aos connections
    const connectionsWithProfiles = connections.map(conn => ({
      ...conn,
      requester: profilesMap.get(conn.requester_id),
      receiver: profilesMap.get(conn.receiver_id)
    }));

    console.log('Loaded connections:', connectionsWithProfiles);
    buildTree(connectionsWithProfiles);
  };

  const getFirstAndLastName = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
  };

  const normalizeRelationship = (value?: string) => {
    const v = (value || '').trim().toLowerCase();
    const map: Record<string, string> = {
      'avó': 'avo',
      'avô': 'avo',
      'avo': 'avo',
      'vovo': 'avo',
      'mae': 'mae',
      'mãe': 'mae',
      'pai': 'pai',
      'irmao': 'irmao',
      'irmão': 'irmao',
      'irma': 'irma',
      'irmã': 'irma',
      'filho': 'filho',
      'filha': 'filha',
      'neto': 'neto',
      'neta': 'neta',
      'conjuge': 'conjuge',
      'cônjuge': 'conjuge',
      'esposo': 'conjuge',
      'esposa': 'conjuge',
      'tio': 'tio',
      'tia': 'tia',
      'root': 'root',
    };
    return map[v] || v;
  };
  const buildTree = async (connections: any[]) => {
    if (!user) return;

    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // Criar mapa de todos os nós
    const nodesMap = new Map<string, TreeNode>();
    
    // Criar nó raiz (usuário atual)
    const root: TreeNode = {
      id: user.id,
      name: 'Você',
      relationship: 'root',
      avatar_url: currentUserProfile?.avatar_url,
      children: [],
      generation: 0,
      isRoot: true
    };
    nodesMap.set(user.id, root);

    // Criar todos os outros nós
    connections.forEach((conn) => {
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const relationship = conn.requester_id === user.id
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;

      const rel = normalizeRelationship(relationship);

      if (!nodesMap.has(otherPerson.id)) {
        nodesMap.set(otherPerson.id, {
          id: otherPerson.id,
          name: getFirstAndLastName(otherPerson.full_name),
          relationship: rel,
          avatar_url: otherPerson.avatar_url,
          children: []
        });
      }
    });

    // Organizar por gerações
    const generations = new Map<number, TreeNode[]>();
    generations.set(-2, []); // Avós
    generations.set(-1, []); // Pais / Tios
    generations.set(0, [root]); // Usuário e irmãos
    generations.set(1, []); // Filhos
    generations.set(2, []); // Netos

    // Mapear cônjuges
    const spouseMap = new Map<string, string>();

    connections.forEach((conn) => {
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const relationship = conn.requester_id === user.id
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;
      
      const rel = normalizeRelationship(relationship);
      const node = nodesMap.get(otherPerson.id)!;

      // Classificar por geração
      if (rel === 'avo') {
        node.generation = -2;
        generations.get(-2)!.push(node);
      } else if (rel === 'tio' || rel === 'tia') {
        node.generation = -1;
        generations.get(-1)!.push(node);
      } else if (rel === 'pai' || rel === 'mae') {
        node.generation = -1;
        generations.get(-1)!.push(node);
        // Pais são pais do root
        node.children.push(root);
      } else if (rel === 'irmao' || rel === 'irma') {
        node.generation = 0;
        generations.get(0)!.push(node);
      } else if (rel === 'filho' || rel === 'filha') {
        node.generation = 1;
        generations.get(1)!.push(node);
        // Filho pertence ao root
        root.children.push(node);
      } else if (rel === 'neto' || rel === 'neta') {
        node.generation = 2;
        generations.get(2)!.push(node);
      } else if (rel === 'conjuge') {
        // Mapear cônjuge
        const partnerId = conn.requester_id === user.id ? conn.receiver_id : conn.requester_id;
        spouseMap.set(otherPerson.id, partnerId);
      }
    });

    // Atribuir cônjuges
    spouseMap.forEach((partnerId, spouseId) => {
      const spouse = nodesMap.get(spouseId);
      const partner = nodesMap.get(partnerId);
      
      if (spouse && partner) {
        // Se o parceiro é o root, atribuir cônjuge ao root
        if (partnerId === user.id) {
          root.spouse = spouse;
          spouse.generation = 0;
        } else if (spouseId === user.id) {
          root.spouse = partner;
          partner.generation = 0;
        } else {
          // Atribuir cônjuge ao parceiro
          partner.spouse = spouse;
          spouse.generation = partner.generation;
        }
      }
    });

    // Calcular posições
    calculateNodePositions(generations, root);
    
    setTreeData({ generations, root });
  };

  const calculateNodePositions = (
    generations: Map<number, TreeNode[]>,
    root: TreeNode
  ) => {
    const nodeWidth = 120;
    const nodeSpacing = 40;
    const spouseSpacing = 20;
    const verticalSpacing = 140;
    const baseY = 300; // Y do usuário (geração 0)
    const centerX = 800;

    // Processar cada geração
    generations.forEach((nodes, generation) => {
      const y = baseY + (generation * verticalSpacing);
      
      // Calcular largura total necessária
      let totalWidth = 0;
      const processedNodes = new Set<string>();
      
      nodes.forEach(node => {
        if (processedNodes.has(node.id)) return;
        
        totalWidth += nodeWidth;
        processedNodes.add(node.id);
        
        if (node.spouse && !processedNodes.has(node.spouse.id)) {
          totalWidth += spouseSpacing + nodeWidth;
          processedNodes.add(node.spouse.id);
        }
        totalWidth += nodeSpacing;
      });
      totalWidth -= nodeSpacing; // Remover último espaçamento

      // Posicionar nós da esquerda para direita
      let currentX = centerX - (totalWidth / 2);
      processedNodes.clear();
      
      nodes.forEach(node => {
        if (processedNodes.has(node.id)) return;
        
        node.x = currentX + (nodeWidth / 2);
        node.y = y;
        currentX += nodeWidth;
        processedNodes.add(node.id);

        if (node.spouse && !processedNodes.has(node.spouse.id)) {
          node.spouse.x = currentX + spouseSpacing + (nodeWidth / 2);
          node.spouse.y = y;
          currentX += spouseSpacing + nodeWidth;
          processedNodes.add(node.spouse.id);
        }
        
        currentX += nodeSpacing;
      });
    });
  };

  const renderGraphView = () => {
    if (!treeData) return null;

    const { generations, root } = treeData;
    const allNodes: TreeNode[] = [];
    const processedSpouses = new Set<string>();
    
    // Coletar todos os nós
    generations.forEach(nodes => {
      nodes.forEach(node => {
        allNodes.push(node);
        if (node.spouse && !processedSpouses.has(node.spouse.id)) {
          allNodes.push(node.spouse);
          processedSpouses.add(node.spouse.id);
        }
      });
    });
    
    // Adicionar cônjuge do root se existir
    if (root.spouse && !processedSpouses.has(root.spouse.id)) {
      allNodes.push(root.spouse);
    }

    const svgWidth = 1800;
    const svgHeight = 700;
    const parentNodes = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'pai' || n.relationship === 'mae'
    );

    return (
      <div className="w-full overflow-auto bg-muted/20 rounded-lg">
        <div className="flex items-center justify-center gap-2 p-2 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          >
            -
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
          >
            +
          </Button>
        </div>
        <div className="flex items-center justify-center p-8">
          <svg 
            width={svgWidth * zoom} 
            height={svgHeight * zoom} 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="mx-auto"
          >
            {/* Conexões entre gerações */}
            {parentNodes.length > 0 && (
              <>
                {/* Linha horizontal dos pais (somente pai/mãe) */}
                <line
                  x1={Math.min(...parentNodes.map(n => n.x!))}
                  y1={parentNodes[0].y! + 30}
                  x2={Math.max(...parentNodes.map(n => n.x!))}
                  y2={parentNodes[0].y! + 30}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.3"
                />
                {/* Linha vertical central dos pais para geração 0 */}
                <line
                  x1={root.x}
                  y1={parentNodes[0].y! + 30}
                  x2={root.x}
                  y2={root.y! - 30}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.3"
                />
              </>
            )}

            {/* Conexões dos irmãos à linha horizontal dos pais */}
            {generations.get(0)!.filter(n => !n.isRoot).map(sibling => {
              const siblingCenterX = sibling.spouse 
                ? (sibling.x! + sibling.spouse.x!) / 2 
                : sibling.x!;
              const parentY = parentNodes.length > 0
                ? parentNodes[0].y! + 30
                : sibling.y! - 60;
              
              return (
                <line
                  key={`sibling-${sibling.id}`}
                  x1={siblingCenterX}
                  y1={parentY}
                  x2={siblingCenterX}
                  y2={sibling.y! - 30}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.3"
                />
              );
            })}

            {/* Linha horizontal para filhos */}
            {root.children.length > 0 && (
              <>
                {/* Linha vertical do casal (ou só do root) até a linha dos filhos */}
                <line
                  x1={root.spouse ? (root.x! + root.spouse.x!) / 2 : root.x!}
                  y1={root.y! + 30}
                  x2={root.spouse ? (root.x! + root.spouse.x!) / 2 : root.x!}
                  y2={root.y! + 60}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.3"
                />
                
                {/* Linha horizontal dos filhos */}
                <line
                  x1={Math.min(...root.children.map(c => c.x!))}
                  y1={root.y! + 60}
                  x2={Math.max(...root.children.map(c => c.x!))}
                  y2={root.y! + 60}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.3"
                />
                
                {/* Linhas verticais conectando cada filho */}
                {root.children.map(child => (
                  <line
                    key={`child-${child.id}`}
                    x1={child.x}
                    y1={root.y! + 60}
                    x2={child.x}
                    y2={child.y! - 30}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                ))}
              </>
            )}

            {/* Conexões de cônjuges */}
            {allNodes.filter(n => n.spouse && n.x && n.spouse.x).map(node => (
              <line
                key={`spouse-${node.id}`}
                x1={node.x}
                y1={node.y}
                x2={node.spouse!.x}
                y2={node.spouse!.y}
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                opacity="0.8"
                strokeDasharray="5,5"
              />
            ))}

            {/* Renderizar nós */}
            {allNodes.map(node => (
              <g key={node.id} transform={`translate(${(node.x || 0) - 60}, ${(node.y || 0) - 30})`}>
                <rect
                  width="120"
                  height="60"
                  rx="8"
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--border))"
                  strokeWidth="1.5"
                  className="transition-all hover:stroke-primary"
                />
                <foreignObject x="6" y="6" width="36" height="36">
                  <Avatar className="w-9 h-9 border border-primary/50">
                    <AvatarImage src={node.avatar_url} alt={node.name} />
                    <AvatarFallback className="bg-primary/20 text-xs">
                      <User className="w-4 h-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                </foreignObject>
                <foreignObject x="45" y="8" width="70" height="48">
                  <div className="text-xs">
                    <p className="font-semibold text-foreground truncate leading-tight">{node.name}</p>
                    {node.relationship !== 'root' && (
                      <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{node.relationship}</p>
                    )}
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const renderListView = (): JSX.Element => {
    if (!treeData) return <div>Nenhum dado</div>;

    const { generations, root } = treeData;

    const siblings = (generations.get(0) || []).filter((n) => !n.isRoot);
    const parents = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'pai' || n.relationship === 'mãe' || n.relationship === 'mae'
    );
    const unclesAunts = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'tio' || n.relationship === 'tia'
    );
    const children = generations.get(1) || [];
    const grandchildren = generations.get(2) || [];
    const grandparents = generations.get(-2) || [];

    const PersonRow = ({ node }: { node: TreeNode }) => (
      <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-lg">
        <Avatar className="w-10 h-10 border border-primary/50">
          <AvatarImage src={node.avatar_url} alt={node.name} />
          <AvatarFallback className="bg-primary/20">
            <User className="w-5 h-5 text-primary" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{node.name}</p>
          {node.relationship !== 'root' && (
            <p className="text-xs text-muted-foreground capitalize">{node.relationship}</p>
          )}
        </div>
        {node.spouse && (
          <>
            <span className="text-muted-foreground mx-2">+</span>
            <Avatar className="w-10 h-10 border border-primary/50">
              <AvatarImage src={node.spouse.avatar_url} alt={node.spouse.name} />
              <AvatarFallback className="bg-primary/20">
                <User className="w-5 h-5 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{node.spouse.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{node.spouse.relationship}</p>
            </div>
          </>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Você (somente o usuário) */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">Você</h3>
          <div className="grid gap-2">
            <PersonRow node={root} />
          </div>
        </div>

        {/* Irmãos */}
        {siblings.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Irmãos</h3>
            <div className="grid gap-2">
              {siblings.map((n) => (
                <PersonRow key={n.id} node={n} />
              ))}
            </div>
          </div>
        )}

        {/* Pais */}
        {parents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Pais</h3>
            <div className="grid gap-2">
              {parents.map((n) => (
                <PersonRow key={n.id} node={n} />
              ))}
            </div>
          </div>
        )}

        {/* Tios */}
        {unclesAunts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Tios</h3>
            <div className="grid gap-2">
              {unclesAunts.map((n) => (
                <PersonRow key={n.id} node={n} />
              ))}
            </div>
          </div>
        )}

        {/* Filhos */}
        {children.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Filhos</h3>
            <div className="grid gap-2">
              {children.map((n) => (
                <PersonRow key={n.id} node={n} />
              ))}
            </div>
          </div>
        )}

        {/* Netos */}
        {grandchildren.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Netos</h3>
            <div className="grid gap-2">
              {grandchildren.map((n) => (
                <PersonRow key={n.id} node={n} />
              ))}
            </div>
          </div>
        )}

        {/* Avós */}
        {grandparents.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Avós</h3>
            <div className="grid gap-2">
              {grandparents.map((n) => (
                <PersonRow key={n.id} node={n} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-6 w-6" />
              Sua Árvore Genealógica
            </CardTitle>
            <CardDescription>
              Visualização da sua rede de conexões familiares
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'graph' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('graph')}
            >
              Gráfico
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {treeData ? (
          <div className="overflow-x-auto">
            {viewMode === 'graph' ? renderGraphView() : renderListView()}
          </div>
        ) : (
          <div className="text-center py-12">
            <TreePine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Sua árvore está vazia. Comece adicionando conexões familiares!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
