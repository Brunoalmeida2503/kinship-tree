import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine, User, ZoomIn, ZoomOut, Maximize2, Move, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [treeData, setTreeData] = useState<{
    generations: Map<number, TreeNode[]>;
    root: TreeNode;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph' | 'map'>('graph');
  const [zoom, setZoom] = useState(isMobile ? 0.5 : 0.7);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [allConnections, setAllConnections] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  useEffect(() => {
    if (viewMode === 'map' && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [viewMode, allConnections]);

  const loadConnections = async () => {
    if (!user) return;

    // Carregar todas as conexões (família e amigos)
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
      setAllConnections([]);
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
      .select('id, full_name, avatar_url, latitude, longitude')
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

    setAllConnections(connectionsWithProfiles);

    // Filtrar apenas conexões de família para a árvore
    const familyConnections = connectionsWithProfiles.filter(
      conn => conn.connection_type === 'family'
    );

    if (familyConnections.length > 0) {
      console.log('Loaded connections:', connectionsWithProfiles);
      buildTree(familyConnections);
    } else {
      setTreeData(null);
    }
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
      'sobrinho': 'sobrinho',
      'sobrinha': 'sobrinha',
      'primo': 'primo',
      'prima': 'prima',
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
      } else if (rel === 'primo' || rel === 'prima') {
        // Primos são da mesma geração (0)
        node.generation = 0;
        generations.get(0)!.push(node);
      } else if (rel === 'filho' || rel === 'filha') {
        node.generation = 1;
        generations.get(1)!.push(node);
        // Filho pertence ao root
        root.children.push(node);
      } else if (rel === 'sobrinho' || rel === 'sobrinha') {
        // Sobrinhos são da geração 1 (filhos dos irmãos)
        node.generation = 1;
        generations.get(1)!.push(node);
      } else if (rel === 'neto' || rel === 'neta') {
        node.generation = 2;
        generations.get(2)!.push(node);
      } else if (rel === 'conjuge') {
        // Mapear cônjuges em ambos os sentidos
        spouseMap.set(conn.requester_id, conn.receiver_id);
        spouseMap.set(conn.receiver_id, conn.requester_id);
      }
    });

    // Atribuir cônjuges
    // Atribuir cônjuges (bidirecional)
    spouseMap.forEach((partnerId, spouseId) => {
      const spouse = nodesMap.get(spouseId);
      const partner = nodesMap.get(partnerId);
      if (spouse && partner) {
        if (partnerId === user.id) {
          root.spouse = spouse;
          spouse.spouse = root;
          spouse.generation = 0;
        } else if (spouseId === user.id) {
          root.spouse = partner;
          partner.spouse = root;
          partner.generation = 0;
        } else {
          partner.spouse = spouse;
          spouse.spouse = partner;
          spouse.generation = partner.generation;
        }
      }
    });

    // Parear automaticamente pai e mãe como cônjuges se ambos existirem
    const parentCandidates = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'pai' || n.relationship === 'mae'
    );
    const father = parentCandidates.find((n) => n.relationship === 'pai');
    const mother = parentCandidates.find((n) => n.relationship === 'mae');
    if (father && mother && !father.spouse && !mother.spouse) {
      father.spouse = mother;
      mother.spouse = father;
    }

    // Calcular posições
    calculateNodePositions(generations, root);
    
    setTreeData({ generations, root });
  };

  const calculateNodePositions = (
    generations: Map<number, TreeNode[]>,
    root: TreeNode
  ) => {
    const nodeWidth = 100;
    const nodeSpacing = 30;
    const spouseSpacing = 15;
    const verticalSpacing = 120;
    const baseY = 250; // Y do usuário (geração 0)
    const centerX = 600;

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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => setZoom(Math.min(3, zoom + (isMobile ? 0.1 : 0.2)));
  const handleZoomOut = () => setZoom(Math.max(0.3, zoom - (isMobile ? 0.1 : 0.2)));
  
  const handleResetView = () => {
    setZoom(isMobile ? 0.5 : 0.7);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const treeWidth = 1200;
    const treeHeight = 600;
    
    const zoomX = (containerWidth * 0.9) / treeWidth;
    const zoomY = (containerHeight * 0.85) / treeHeight;
    const optimalZoom = Math.min(zoomX, zoomY, 2);
    
    setZoom(Math.max(optimalZoom, 0.3));
    setPanOffset({ x: 0, y: 0 });
  };

  const renderGraphView = () => {
    if (!treeData) return null;

    const { generations, root } = treeData;
    const allNodes: TreeNode[] = [];
    const seen = new Set<string>();
    
    // Coletar todos os nós (sem duplicar pares)
    generations.forEach(nodes => {
      nodes.forEach(node => {
        if (seen.has(node.id)) return;
        allNodes.push(node);
        seen.add(node.id);
        if (node.spouse && !seen.has(node.spouse.id)) {
          allNodes.push(node.spouse);
          seen.add(node.spouse.id);
        }
      });
    });
    
    // Garantir cônjuge do root
    if (root.spouse && !seen.has(root.spouse.id)) {
      allNodes.push(root.spouse);
      seen.add(root.spouse.id);
    }

    const svgWidth = 1200;
    const svgHeight = 600;
    const parentNodes = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'pai' || n.relationship === 'mae'
    );

    return (
      <div ref={containerRef} className="w-full bg-muted/20 rounded-lg">
        <div className="flex items-center justify-between gap-2 p-2 sm:p-3 border-b border-border">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={handleZoomOut}
              title="Reduzir zoom"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
            >
              <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={handleZoomIn}
              title="Aumentar zoom"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
            >
              <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={handleFitToScreen}
              title="Ajustar à tela"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
            >
              <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="outline"
              size={isMobile ? "icon" : "sm"}
              onClick={handleResetView}
              title="Resetar"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
            >
              <Move className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
            Arraste para navegar • Role para zoom
          </p>
        </div>
        <ScrollArea className="w-full h-[400px] sm:h-[500px] md:h-[600px]">
          <div 
            className="w-full p-2 sm:p-4 md:p-8 cursor-grab active:cursor-grabbing touch-pan-y"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} } as any);
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as any);
            }}
            onTouchEnd={handleMouseUp}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) {
                handleZoomIn();
              } else {
                handleZoomOut();
              }
            }}
          >
            <svg 
              width="100%"
              height="auto"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className="mx-auto pointer-events-none select-none"
              style={{ 
                transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`, 
                transformOrigin: 'center', 
                transition: isPanning ? 'none' : 'transform 0.2s ease-out',
                minWidth: `${svgWidth * zoom}px`,
                minHeight: `${svgHeight * zoom}px`
              }}
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
                  x1={(Math.min(...parentNodes.map(n => n.x!)) + Math.max(...parentNodes.map(n => n.x!))) / 2}
                  y1={parentNodes[0].y! + 30}
                  x2={(Math.min(...parentNodes.map(n => n.x!)) + Math.max(...parentNodes.map(n => n.x!))) / 2}
                  y2={(root.spouse ? Math.min(root.y!, root.spouse.y!) : root.y!) - 30}
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
            {allNodes.filter(n => n.spouse && n.x && n.spouse.x && n.id < n.spouse!.id).map(node => (
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
            {allNodes.map(node => {
              const nodeWidth = isMobile ? 100 : 120;
              const nodeHeight = isMobile ? 50 : 60;
              const avatarSize = isMobile ? 28 : 36;
              const textWidth = isMobile ? 58 : 70;
              
              return (
                <g key={node.id} transform={`translate(${(node.x || 0) - nodeWidth/2}, ${(node.y || 0) - nodeHeight/2})`}>
                  <rect
                    width={nodeWidth}
                    height={nodeHeight}
                    rx={isMobile ? "6" : "8"}
                    fill="hsl(var(--card))"
                    stroke="hsl(var(--border))"
                    strokeWidth="1.5"
                    className="transition-all hover:stroke-primary"
                  />
                  <foreignObject x="6" y={isMobile ? "4" : "6"} width={avatarSize} height={avatarSize}>
                    <Avatar className={`${isMobile ? 'w-7 h-7' : 'w-9 h-9'} border border-primary/50`}>
                      <AvatarImage src={node.avatar_url} alt={node.name} />
                      <AvatarFallback className="bg-primary/20 text-xs">
                        <User className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-primary`} />
                      </AvatarFallback>
                    </Avatar>
                  </foreignObject>
                  <foreignObject x={isMobile ? "37" : "45"} y={isMobile ? "6" : "8"} width={textWidth} height={nodeHeight - 12}>
                    <div className={isMobile ? "text-[10px]" : "text-xs"}>
                      <p className="font-semibold text-foreground truncate leading-tight">
                        {isMobile && node.name.length > 12 ? node.name.substring(0, 10) + '...' : node.name}
                      </p>
                      {node.relationship !== 'root' && (
                        <p className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-muted-foreground capitalize mt-0.5`}>
                          {node.relationship}
                        </p>
                      )}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
            </svg>
          </div>
          <ScrollBar orientation="horizontal" />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    );
  };

  const renderListView = (): JSX.Element => {
    if (!treeData) return <div>Nenhum dado</div>;

    const { generations, root } = treeData;

    const siblings = (generations.get(0) || []).filter((n) => !n.isRoot && (n.relationship === 'irmao' || n.relationship === 'irma'));
    const cousins = (generations.get(0) || []).filter((n) => n.relationship === 'primo' || n.relationship === 'prima');
    const parents = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'pai' || n.relationship === 'mãe' || n.relationship === 'mae'
    );
    const unclesAunts = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'tio' || n.relationship === 'tia'
    );
    const children = (generations.get(1) || []).filter((n) => n.relationship === 'filho' || n.relationship === 'filha');
    const nephewsNieces = (generations.get(1) || []).filter((n) => n.relationship === 'sobrinho' || n.relationship === 'sobrinha');
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

        {/* Primos */}
        {cousins.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Primos</h3>
            <div className="grid gap-2">
              {cousins.map((n) => (
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

        {/* Sobrinhos */}
        {nephewsNieces.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Sobrinhos</h3>
            <div className="grid gap-2">
              {nephewsNieces.map((n) => (
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

  const initializeMap = async () => {
    if (!mapContainer.current || !user || map.current) return;

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not configured');
      return;
    }

    // Buscar perfil do usuário atual
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('latitude, longitude')
      .eq('id', user.id)
      .single();

    if (!userProfile?.latitude || !userProfile?.longitude) {
      console.warn('User location not set');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [userProfile.longitude, userProfile.latitude],
        zoom: 10,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        if (!map.current) return;

        const bounds = new mapboxgl.LngLatBounds();

        // Adicionar marcador do usuário (estilo missão)
        const userMarker = document.createElement('div');
        userMarker.style.backgroundColor = '#8B5CF6';
        userMarker.style.width = '44px';
        userMarker.style.height = '44px';
        userMarker.style.borderRadius = '50%';
        userMarker.style.border = '3px solid white';
        userMarker.style.display = 'flex';
        userMarker.style.alignItems = 'center';
        userMarker.style.justifyContent = 'center';
        userMarker.style.color = 'white';
        userMarker.style.fontWeight = 'bold';
        userMarker.style.fontSize = '16px';
        userMarker.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        userMarker.textContent = '0';

        new mapboxgl.Marker(userMarker)
          .setLngLat([userProfile.longitude, userProfile.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="p-2">
                <p class="font-semibold">Você</p>
                <p class="text-xs text-muted-foreground">Centro da sua rede</p>
              </div>`
            )
          )
          .addTo(map.current);

        bounds.extend([userProfile.longitude, userProfile.latitude]);

        // Processar cada conexão e adicionar linhas
        allConnections.forEach((conn, index) => {
          const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
          
          if (!otherPerson?.latitude || !otherPerson?.longitude) return;

          const isFamilyConnection = conn.connection_type === 'family';
          const markerColor = isFamilyConnection ? '#22c55e' : '#3b82f6'; // verde para família, azul para amigos
          const lineColor = isFamilyConnection ? '#22c55e' : '#3b82f6';

          // Adicionar marcador da conexão (estilo missão com número)
          const markerEl = document.createElement('div');
          markerEl.style.backgroundColor = markerColor;
          markerEl.style.width = '36px';
          markerEl.style.height = '36px';
          markerEl.style.borderRadius = '50%';
          markerEl.style.border = '3px solid white';
          markerEl.style.display = 'flex';
          markerEl.style.alignItems = 'center';
          markerEl.style.justifyContent = 'center';
          markerEl.style.color = 'white';
          markerEl.style.fontWeight = 'bold';
          markerEl.style.fontSize = '14px';
          markerEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          markerEl.style.cursor = 'pointer';
          markerEl.textContent = (index + 1).toString();

          const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
            `<div class="p-2">
              <p class="font-semibold">${otherPerson.full_name}</p>
              <p class="text-xs text-muted-foreground">${isFamilyConnection ? 'Família' : 'Amigo'}</p>
            </div>`
          );

          new mapboxgl.Marker(markerEl)
            .setLngLat([otherPerson.longitude, otherPerson.latitude])
            .setPopup(popup)
            .addTo(map.current!);

          bounds.extend([otherPerson.longitude, otherPerson.latitude]);

          // Adicionar linha conectando usuário à conexão
          const lineId = `connection-line-${index}`;
          const lineCoordinates: [number, number][] = [
            [userProfile.longitude, userProfile.latitude],
            [otherPerson.longitude, otherPerson.latitude],
          ];

          map.current!.addSource(lineId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: lineCoordinates,
              },
            },
          });

          map.current!.addLayer({
            id: lineId,
            type: 'line',
            source: lineId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': lineColor,
              'line-width': 3,
              'line-opacity': 0.8,
            },
          });
        });

        // Ajustar mapa para mostrar todos os marcadores
        if (allConnections.length > 0) {
          map.current!.fitBounds(bounds, { padding: 80, maxZoom: 14 });
        }
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  const renderMapView = () => {
    return (
      <div className="w-full h-[500px] rounded-lg overflow-hidden border border-border">
        <div ref={mapContainer} className="w-full h-full" />
        {(!allConnections || allConnections.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <MapIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma conexão com localização cadastrada
              </p>
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
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <MapIcon className="h-4 w-4 mr-1" />
              Mapa
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'map' ? (
          renderMapView()
        ) : treeData ? (
          <div>
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
