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
  level?: number;
}

export function TreeVisualization() {
  const { user } = useAuth();
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph');
  const [zoom, setZoom] = useState(1);
  const [parents, setParents] = useState<TreeNode[]>([]);
  const [siblings, setSiblings] = useState<TreeNode[]>([]);

  useEffect(() => {
    if (user) {
      loadConnections();
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
      buildTree(data);
    }
  };

  const getFirstAndLastName = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[names.length - 1]}`;
  };

  const buildTree = async (connections: any[]) => {
    if (!user) return;

    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    const nodesMap = new Map<string, TreeNode>();
    
    nodesMap.set(user.id, {
      id: user.id,
      name: 'Você',
      relationship: 'root',
      avatar_url: currentUserProfile?.avatar_url,
      children: [],
      level: 0
    });

    connections.forEach((conn) => {
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const relationship = conn.requester_id === user.id
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;

      if (!nodesMap.has(otherPerson.id)) {
        nodesMap.set(otherPerson.id, {
          id: otherPerson.id,
          name: getFirstAndLastName(otherPerson.full_name),
          relationship: relationship,
          avatar_url: otherPerson.avatar_url,
          children: []
        });
      }
    });

    const root = nodesMap.get(user.id)!;
    const parentsArr: TreeNode[] = [];
    const siblingsArr: TreeNode[] = [];
    const children: TreeNode[] = [];

    connections.forEach((conn) => {
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const relationship = conn.requester_id === user.id
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;
      
      const node = nodesMap.get(otherPerson.id)!;

      if (relationship === 'pai' || relationship === 'mãe' || relationship === 'mae') {
        node.level = -1;
        parentsArr.push(node);
      } else if (relationship === 'irmão' || relationship === 'irmao' || relationship === 'irmã') {
        node.level = 0;
        siblingsArr.push(node);
      } else if (relationship === 'filho' || relationship === 'filha') {
        node.level = 1;
        children.push(node);
        root.children.push(node);
      } else if (relationship === 'cônjuge' || relationship === 'conjuge' || relationship === 'esposo' || relationship === 'esposa') {
        node.level = 0;
        root.spouse = node;
      }
    });

    setParents(parentsArr);
    setSiblings(siblingsArr);
    calculateNodePositions(root, parentsArr, siblingsArr, children);
    setTreeData(root);
  };

  const calculateNodePositions = (
    root: TreeNode, 
    parents: TreeNode[], 
    siblings: TreeNode[], 
    children: TreeNode[]
  ) => {
    const nodeWidth = 120;
    const horizontalSpacing = 40;
    const verticalSpacing = 120;
    const centerX = 600;

    root.x = centerX;
    root.y = 300;

    if (root.spouse) {
      root.spouse.x = centerX + nodeWidth + 20;
      root.spouse.y = 300;
    }

    if (parents.length > 0) {
      const parentStartX = centerX - ((parents.length - 1) * (nodeWidth + horizontalSpacing)) / 2;
      parents.forEach((parent, idx) => {
        parent.x = parentStartX + idx * (nodeWidth + horizontalSpacing);
        parent.y = 180;
      });
    }

    if (siblings.length > 0) {
      const totalSiblings = siblings.length + 1 + (root.spouse ? 1 : 0);
      const startX = centerX - ((totalSiblings - 1) * (nodeWidth + horizontalSpacing)) / 2;
      
      siblings.forEach((sibling, idx) => {
        sibling.x = startX + idx * (nodeWidth + horizontalSpacing);
        sibling.y = 300;
      });
    }

    if (children.length > 0) {
      const parentWidth = root.spouse ? (nodeWidth * 2 + 20) : nodeWidth;
      const childStartX = centerX + parentWidth/2 - ((children.length - 1) * (nodeWidth + horizontalSpacing)) / 2 - nodeWidth/2;
      children.forEach((child, idx) => {
        child.x = childStartX + idx * (nodeWidth + horizontalSpacing);
        child.y = 420;
      });
    }
  };

  const renderGraphView = () => {
    if (!treeData) return null;

    const allNodes: TreeNode[] = [treeData, ...siblings, ...parents];
    if (treeData.spouse) allNodes.push(treeData.spouse);
    treeData.children.forEach(child => allNodes.push(child));

    const svgWidth = 1400;
    const svgHeight = 600;

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
            {/* Parent to children lines */}
            {parents.map(parent => (
              <line
                key={`parent-line-${parent.id}`}
                x1={parent.x}
                y1={(parent.y || 0) + 30}
                x2={treeData.x}
                y2={(treeData.y || 0) - 30}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                opacity="0.4"
              />
            ))}

            {/* Root to children lines */}
            {treeData.children.map(child => {
              const parentX = treeData.spouse ? (treeData.x! + treeData.spouse.x!) / 2 : treeData.x!;
              return (
                <g key={`child-line-${child.id}`}>
                  <line
                    x1={parentX}
                    y1={(treeData.y || 0) + 30}
                    x2={parentX}
                    y2={(treeData.y || 0) + 60}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.4"
                  />
                  <line
                    x1={parentX}
                    y1={(treeData.y || 0) + 60}
                    x2={child.x}
                    y2={(treeData.y || 0) + 60}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.4"
                  />
                  <line
                    x1={child.x}
                    y1={(treeData.y || 0) + 60}
                    x2={child.x}
                    y2={(child.y || 0) - 30}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.4"
                  />
                </g>
              );
            })}

            {/* Spouse connection */}
            {treeData.spouse && (
              <line
                x1={treeData.x}
                y1={treeData.y}
                x2={treeData.spouse.x}
                y2={treeData.spouse.y}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                opacity="0.6"
              />
            )}

            {/* Sibling connections */}
            {siblings.map((sibling, idx) => (
              <line
                key={`sibling-line-${sibling.id}`}
                x1={sibling.x}
                y1={(sibling.y || 0) - 30}
                x2={treeData.x}
                y2={(treeData.y || 0) - 30}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                opacity="0.4"
                strokeDasharray="5,5"
              />
            ))}

            {/* Nodes */}
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

  const renderListView = (node: TreeNode, level: number = 0): JSX.Element => {
    return (
      <div key={node.id} className={`ml-${level * 8}`}>
        <div className="flex items-center gap-2 p-3 my-2 bg-card border border-border-subtle rounded-lg hover:shadow-elegant transition-smooth">
          <TreePine className="h-4 w-4 text-primary" />
          <div>
            <p className="font-medium">{node.name}</p>
            {node.relationship !== 'root' && (
              <p className="text-xs text-muted-foreground capitalize">{node.relationship}</p>
            )}
          </div>
        </div>
        {node.children.length > 0 && (
          <div className="ml-6 border-l-2 border-border-subtle pl-4">
            {node.children.map((child) => renderListView(child, level + 1))}
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
            {viewMode === 'graph' ? renderGraphView() : renderListView(treeData)}
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
