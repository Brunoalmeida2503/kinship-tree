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
    const nodeWidth = 140;
    const nodeSpacing = 60;
    const spouseSpacing = 20;
    const verticalSpacing = 160;
    const baseY = 300;
    const centerX = 700;

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
      totalWidth -= nodeSpacing;

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

  // Função para obter cor da geração
  const getGenerationColor = (generation: number, isRoot?: boolean) => {
    if (isRoot) return { bg: 'hsl(var(--primary))', border: 'hsl(var(--primary))', text: 'hsl(var(--primary-foreground))' };
    
    const colors: Record<number, { bg: string; border: string; text: string }> = {
      [-2]: { bg: 'hsl(45 93% 47%)', border: 'hsl(45 93% 40%)', text: 'hsl(0 0% 100%)' }, // Avós - Dourado
      [-1]: { bg: 'hsl(142 71% 45%)', border: 'hsl(142 71% 35%)', text: 'hsl(0 0% 100%)' }, // Pais - Verde
      [0]: { bg: 'hsl(221 83% 53%)', border: 'hsl(221 83% 43%)', text: 'hsl(0 0% 100%)' }, // Irmãos - Azul
      [1]: { bg: 'hsl(280 67% 54%)', border: 'hsl(280 67% 44%)', text: 'hsl(0 0% 100%)' }, // Filhos - Roxo
      [2]: { bg: 'hsl(330 80% 55%)', border: 'hsl(330 80% 45%)', text: 'hsl(0 0% 100%)' }, // Netos - Rosa
    };
    return colors[generation] || { bg: 'hsl(var(--muted))', border: 'hsl(var(--border))', text: 'hsl(var(--foreground))' };
  };

  // Obter label da geração
  const getGenerationLabel = (generation: number) => {
    const labels: Record<number, string> = {
      [-2]: 'Avós',
      [-1]: 'Pais/Tios',
      [0]: 'Você & Irmãos',
      [1]: 'Filhos/Sobrinhos',
      [2]: 'Netos',
    };
    return labels[generation] || '';
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

    const svgWidth = 1400;
    const svgHeight = 800;
    const parentNodes = (generations.get(-1) || []).filter(
      (n) => n.relationship === 'pai' || n.relationship === 'mae'
    );

    // Gerações ativas para legenda
    const activeGenerations: number[] = [];
    generations.forEach((nodes, gen) => {
      if (nodes.length > 0) activeGenerations.push(gen);
    });
    activeGenerations.sort((a, b) => a - b);

    return (
      <div ref={containerRef} className="w-full bg-gradient-to-b from-muted/10 to-muted/30 rounded-xl border border-border/50">
        {/* Controles de navegação */}
        <div className="flex items-center justify-between gap-2 p-3 sm:p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm rounded-t-xl">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              title="Reduzir zoom"
              className="h-9 w-9 rounded-full"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1 bg-muted rounded-full text-sm font-medium">
              {Math.round(zoom * 100)}%
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              title="Aumentar zoom"
              className="h-9 w-9 rounded-full"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border mx-2 hidden sm:block" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToScreen}
              title="Ajustar à tela"
              className="h-9 w-9 rounded-full hidden sm:flex"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetView}
              title="Resetar visualização"
              className="h-9 w-9 rounded-full hidden sm:flex"
            >
              <Move className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Legenda de cores */}
          <div className="hidden md:flex items-center gap-3">
            {activeGenerations.map(gen => {
              const colors = getGenerationColor(gen, gen === 0);
              return (
                <div key={gen} className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <span className="text-xs text-muted-foreground">{getGenerationLabel(gen)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <ScrollArea className="w-full h-[500px] sm:h-[550px] md:h-[650px]">
          <div 
            className="w-full p-4 sm:p-6 md:p-8 cursor-grab active:cursor-grabbing touch-pan-y select-none"
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
              if (e.deltaY < 0) handleZoomIn();
              else handleZoomOut();
            }}
          >
            <svg 
              width="100%"
              height="auto"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
              className="mx-auto pointer-events-none"
              style={{ 
                transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`, 
                transformOrigin: 'center', 
                transition: isPanning ? 'none' : 'transform 0.3s ease-out',
                minWidth: `${svgWidth * zoom}px`,
                minHeight: `${svgHeight * zoom}px`
              }}
            >
              {/* Definições de gradientes e filtros */}
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15"/>
                </filter>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6"/>
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
                </linearGradient>
                <marker id="heartMarker" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
                  <circle cx="5" cy="5" r="3" fill="hsl(var(--destructive))"/>
                </marker>
              </defs>

              {/* Linhas de fundo para as gerações */}
              {activeGenerations.map(gen => {
                const nodes = generations.get(gen) || [];
                if (nodes.length === 0) return null;
                const y = nodes[0].y!;
                return (
                  <g key={`gen-bg-${gen}`}>
                    <line
                      x1="50"
                      y1={y}
                      x2={svgWidth - 50}
                      y2={y}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                      strokeDasharray="8,8"
                      opacity="0.3"
                    />
                    <text
                      x="30"
                      y={y + 5}
                      fill="hsl(var(--muted-foreground))"
                      fontSize="11"
                      fontWeight="500"
                      textAnchor="start"
                      opacity="0.6"
                    >
                      {getGenerationLabel(gen)}
                    </text>
                  </g>
                );
              })}

              {/* Conexões entre pais e filhos - Linhas curvas elegantes */}
              {parentNodes.length > 0 && (
                <g>
                  {/* Linha horizontal conectando pais */}
                  <path
                    d={`M ${Math.min(...parentNodes.map(n => n.x!))} ${parentNodes[0].y! + 45}
                        L ${Math.max(...parentNodes.map(n => n.x!))} ${parentNodes[0].y! + 45}`}
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Linha vertical do centro dos pais até a geração 0 */}
                  <path
                    d={`M ${(Math.min(...parentNodes.map(n => n.x!)) + Math.max(...parentNodes.map(n => n.x!))) / 2} ${parentNodes[0].y! + 45}
                        C ${(Math.min(...parentNodes.map(n => n.x!)) + Math.max(...parentNodes.map(n => n.x!))) / 2} ${parentNodes[0].y! + 80}
                          ${(root.spouse ? (root.x! + root.spouse.x!) / 2 : root.x!)} ${root.y! - 80}
                          ${(root.spouse ? (root.x! + root.spouse.x!) / 2 : root.x!)} ${root.y! - 45}`}
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* Conexões dos irmãos */}
              {generations.get(0)!.filter(n => !n.isRoot && (n.relationship === 'irmao' || n.relationship === 'irma')).map(sibling => {
                const siblingCenterX = sibling.spouse 
                  ? (sibling.x! + sibling.spouse.x!) / 2 
                  : sibling.x!;
                const parentY = parentNodes.length > 0
                  ? parentNodes[0].y! + 45
                  : sibling.y! - 80;
                
                return (
                  <path
                    key={`sibling-${sibling.id}`}
                    d={`M ${siblingCenterX} ${parentY}
                        L ${siblingCenterX} ${sibling.y! - 45}`}
                    stroke="url(#lineGradient)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Linha horizontal para filhos */}
              {root.children.length > 0 && (
                <g>
                  {/* Linha vertical do casal até a linha dos filhos */}
                  <path
                    d={`M ${root.spouse ? (root.x! + root.spouse.x!) / 2 : root.x!} ${root.y! + 45}
                        L ${root.spouse ? (root.x! + root.spouse.x!) / 2 : root.x!} ${root.y! + 80}`}
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  
                  {/* Linha horizontal dos filhos */}
                  <path
                    d={`M ${Math.min(...root.children.map(c => c.x!))} ${root.y! + 80}
                        L ${Math.max(...root.children.map(c => c.x!))} ${root.y! + 80}`}
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  
                  {/* Linhas verticais conectando cada filho */}
                  {root.children.map(child => (
                    <path
                      key={`child-${child.id}`}
                      d={`M ${child.x} ${root.y! + 80}
                          L ${child.x} ${child.y! - 45}`}
                      stroke="url(#lineGradient)"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                    />
                  ))}
                </g>
              )}

              {/* Conexões de cônjuges - linha com coração */}
              {allNodes.filter(n => n.spouse && n.x && n.spouse.x && n.id < n.spouse!.id).map(node => (
                <g key={`spouse-${node.id}`}>
                  <line
                    x1={node.x! + 40}
                    y1={node.y}
                    x2={node.spouse!.x! - 40}
                    y2={node.spouse!.y}
                    stroke="hsl(var(--destructive))"
                    strokeWidth="2"
                    opacity="0.6"
                  />
                  {/* Coração no meio */}
                  <text
                    x={(node.x! + node.spouse!.x!) / 2}
                    y={node.y! + 5}
                    fontSize="14"
                    textAnchor="middle"
                  >
                    ❤️
                  </text>
                </g>
              ))}

              {/* Renderizar nós */}
              {allNodes.map(node => {
                const nodeWidth = isMobile ? 120 : 140;
                const nodeHeight = isMobile ? 70 : 85;
                const avatarSize = isMobile ? 36 : 45;
                const colors = getGenerationColor(node.generation || 0, node.isRoot);
                
                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${(node.x || 0) - nodeWidth/2}, ${(node.y || 0) - nodeHeight/2})`}
                    filter="url(#shadow)"
                    className="transition-transform duration-200 hover:scale-105"
                    style={{ transformOrigin: 'center' }}
                  >
                    {/* Fundo do card */}
                    <rect
                      width={nodeWidth}
                      height={nodeHeight}
                      rx="12"
                      fill="hsl(var(--card))"
                      stroke={colors.border}
                      strokeWidth={node.isRoot ? "3" : "2"}
                    />
                    
                    {/* Barra de cor da geração */}
                    <rect
                      x="0"
                      y="0"
                      width={nodeWidth}
                      height="6"
                      rx="12"
                      ry="0"
                      fill={colors.bg}
                      clipPath="inset(0 0 calc(100% - 12px) 0 round 12px)"
                    />
                    <rect
                      x="0"
                      y="0"
                      width={nodeWidth}
                      height="6"
                      fill={colors.bg}
                    />
                    <rect
                      x="0"
                      y="0"
                      width="12"
                      height="6"
                      fill={colors.bg}
                      rx="12"
                      ry="12"
                    />
                    <rect
                      x={nodeWidth - 12}
                      y="0"
                      width="12"
                      height="6"
                      fill={colors.bg}
                      rx="12"
                      ry="12"
                    />
                    
                    {/* Avatar */}
                    <foreignObject x="10" y="14" width={avatarSize} height={avatarSize}>
                      <Avatar className={`${isMobile ? 'w-9 h-9' : 'w-11 h-11'} border-2`} style={{ borderColor: colors.bg }}>
                        <AvatarImage src={node.avatar_url} alt={node.name} />
                        <AvatarFallback style={{ backgroundColor: colors.bg, color: colors.text }}>
                          <User className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                        </AvatarFallback>
                      </Avatar>
                    </foreignObject>
                    
                    {/* Textos */}
                    <foreignObject x={isMobile ? "52" : "60"} y="14" width={nodeWidth - (isMobile ? 60 : 70)} height={nodeHeight - 20}>
                      <div className="h-full flex flex-col justify-center">
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-foreground truncate leading-tight`}>
                          {node.isRoot ? 'Você' : (isMobile && node.name.length > 10 ? node.name.substring(0, 8) + '...' : node.name)}
                        </p>
                        {node.relationship !== 'root' && (
                          <p 
                            className={`${isMobile ? 'text-[9px]' : 'text-xs'} font-medium capitalize mt-1 px-2 py-0.5 rounded-full inline-block w-fit`}
                            style={{ backgroundColor: `${colors.bg}20`, color: colors.bg }}
                          >
                            {node.relationship}
                          </p>
                        )}
                        {node.isRoot && (
                          <p 
                            className={`${isMobile ? 'text-[9px]' : 'text-xs'} font-medium mt-1 px-2 py-0.5 rounded-full inline-block w-fit`}
                            style={{ backgroundColor: `hsl(var(--primary) / 0.2)`, color: 'hsl(var(--primary))' }}
                          >
                            Principal
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

        {/* Legenda mobile */}
        <div className="flex md:hidden items-center justify-center gap-2 p-3 border-t border-border/50 flex-wrap">
          {activeGenerations.map(gen => {
            const colors = getGenerationColor(gen, gen === 0);
            return (
              <div key={gen} className="flex items-center gap-1">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: colors.bg }}
                />
                <span className="text-[10px] text-muted-foreground">{getGenerationLabel(gen)}</span>
              </div>
            );
          })}
        </div>
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

  // Função para criar linha curva (arco) entre dois pontos
  const createArcLine = (start: [number, number], end: [number, number], numPoints: number = 50): [number, number][] => {
    const points: [number, number][] = [];
    const midLng = (start[0] + end[0]) / 2;
    const midLat = (start[1] + end[1]) / 2;
    
    // Calcular distância para determinar a curvatura
    const distance = Math.sqrt(
      Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
    );
    
    // Curvatura proporcional à distância
    const curvature = Math.min(distance * 0.15, 0.5);
    
    // Ponto de controle perpendicular à linha
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
    const controlLng = midLng + Math.cos(angle + Math.PI / 2) * curvature;
    const controlLat = midLat + Math.sin(angle + Math.PI / 2) * curvature;
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      // Curva de Bézier quadrática
      const lng = Math.pow(1 - t, 2) * start[0] + 2 * (1 - t) * t * controlLng + Math.pow(t, 2) * end[0];
      const lat = Math.pow(1 - t, 2) * start[1] + 2 * (1 - t) * t * controlLat + Math.pow(t, 2) * end[1];
      points.push([lng, lat]);
    }
    
    return points;
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
        style: 'mapbox://styles/mapbox/light-v11',
        center: [userProfile.longitude, userProfile.latitude],
        zoom: 10,
        pitch: 15,
        bearing: 0,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      // Adicionar estilos CSS para animações
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes marker-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .map-marker {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: marker-bounce 0.5s ease-out;
        }
        .map-marker:hover {
          transform: scale(1.15);
          box-shadow: 0 8px 25px rgba(0,0,0,0.35);
        }
        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .marker-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `;
      document.head.appendChild(styleSheet);

      map.current.on('load', () => {
        if (!map.current) return;

        // Adicionar atmosfera suave ao mapa
        map.current.setFog({
          color: 'rgb(255, 255, 255)',
          'high-color': 'rgb(200, 200, 225)',
          'horizon-blend': 0.1,
        });

        const bounds = new mapboxgl.LngLatBounds();

        // Criar marcador do usuário com animação de pulso
        const userMarkerContainer = document.createElement('div');
        userMarkerContainer.className = 'marker-container';
        userMarkerContainer.style.width = '52px';
        userMarkerContainer.style.height = '52px';

        const userPulse = document.createElement('div');
        userPulse.className = 'pulse-ring';
        userPulse.style.backgroundColor = 'rgba(139, 92, 246, 0.4)';
        userMarkerContainer.appendChild(userPulse);

        const userMarker = document.createElement('div');
        userMarker.className = 'map-marker';
        userMarker.style.cssText = `
          position: absolute;
          background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 4px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
          cursor: pointer;
        `;
        userMarker.textContent = '★';
        userMarkerContainer.appendChild(userMarker);

        new mapboxgl.Marker(userMarkerContainer)
          .setLngLat([userProfile.longitude, userProfile.latitude])
          .setPopup(
            new mapboxgl.Popup({ 
              offset: 25,
              className: 'rounded-lg shadow-xl'
            }).setHTML(
              `<div class="p-3">
                <p class="font-bold text-base">Você</p>
                <p class="text-sm text-gray-500">Centro da sua rede familiar</p>
              </div>`
            )
          )
          .addTo(map.current);

        bounds.extend([userProfile.longitude, userProfile.latitude]);

        // Processar cada conexão com animação sequencial
        allConnections.forEach((conn, index) => {
          const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
          
          if (!otherPerson?.latitude || !otherPerson?.longitude) {
            return;
          }

          const isFamilyConnection = conn.connection_type === 'family';
          const markerGradient = isFamilyConnection 
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
          const lineColor = isFamilyConnection ? '#22c55e' : '#3b82f6';
          const glowColor = isFamilyConnection ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)';

          // Criar marcador com animação de entrada atrasada
          setTimeout(() => {
            const markerContainer = document.createElement('div');
            markerContainer.className = 'marker-container';
            markerContainer.style.width = '44px';
            markerContainer.style.height = '44px';
            markerContainer.style.opacity = '0';
            markerContainer.style.transition = 'opacity 0.5s ease-out';

            const markerEl = document.createElement('div');
            markerEl.className = 'map-marker';
            markerEl.style.cssText = `
              background: ${markerGradient};
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: 3px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
              box-shadow: 0 4px 12px ${glowColor};
              cursor: pointer;
            `;
            markerEl.textContent = (index + 1).toString();
            markerContainer.appendChild(markerEl);

            const popup = new mapboxgl.Popup({ 
              offset: 25,
              className: 'rounded-lg shadow-xl'
            }).setHTML(
              `<div class="p-3">
                <p class="font-bold text-base">${otherPerson.full_name}</p>
                <p class="text-sm" style="color: ${lineColor}">${isFamilyConnection ? '👨‍👩‍👧‍👦 Família' : '👥 Amigo'}</p>
              </div>`
            );

            new mapboxgl.Marker(markerContainer)
              .setLngLat([otherPerson.longitude, otherPerson.latitude])
              .setPopup(popup)
              .addTo(map.current!);

            // Fade in do marcador
            requestAnimationFrame(() => {
              markerContainer.style.opacity = '1';
            });

            bounds.extend([otherPerson.longitude, otherPerson.latitude]);

            // Adicionar linha curva com animação
            const lineId = `connection-line-${index}`;
            const arcCoordinates = createArcLine(
              [userProfile.longitude, userProfile.latitude],
              [otherPerson.longitude, otherPerson.latitude]
            );

            try {
              map.current!.addSource(lineId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: arcCoordinates,
                  },
                },
              });

              // Linha de fundo (glow)
              map.current!.addLayer({
                id: `${lineId}-glow`,
                type: 'line',
                source: lineId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': lineColor,
                  'line-width': 8,
                  'line-opacity': 0.2,
                  'line-blur': 3,
                },
              });

              // Linha principal
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
                  'line-opacity': 0.85,
                },
              });

              // Linha de destaque (dash animado)
              map.current!.addLayer({
                id: `${lineId}-dash`,
                type: 'line',
                source: lineId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#ffffff',
                  'line-width': 1,
                  'line-opacity': 0.5,
                  'line-dasharray': [2, 4],
                },
              });

            } catch (error) {
              console.error(`Erro ao adicionar linha ${index + 1}:`, error);
            }
          }, index * 150); // Delay escalonado para animação sequencial
        });

        // Ajustar mapa para mostrar todos os marcadores com animação suave
        setTimeout(() => {
          if (allConnections.length > 0 && map.current) {
            map.current.fitBounds(bounds, { 
              padding: 100, 
              maxZoom: 12,
              duration: 1500,
              essential: true
            });
          }
        }, allConnections.length * 150 + 300);
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
