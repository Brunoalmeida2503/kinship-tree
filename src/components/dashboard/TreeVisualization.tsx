import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

    // Get current user profile
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // Create nodes map
    const nodesMap = new Map<string, TreeNode>();
    
    // Add current user
    nodesMap.set(user.id, {
      id: user.id,
      name: 'Você',
      relationship: 'root',
      avatar_url: currentUserProfile?.avatar_url,
      children: [],
      level: 0
    });

    // Add all connected people
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

    // Organize by hierarchy
    const root = nodesMap.get(user.id)!;
    const parents: TreeNode[] = [];
    const siblings: TreeNode[] = [];
    const children: TreeNode[] = [];
    const spouse: TreeNode[] = [];

    connections.forEach((conn) => {
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const relationship = conn.requester_id === user.id
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;
      
      const node = nodesMap.get(otherPerson.id)!;

      if (relationship === 'pai' || relationship === 'mãe' || relationship === 'mae') {
        node.level = -1;
        parents.push(node);
      } else if (relationship === 'irmão' || relationship === 'irmao' || relationship === 'irmã') {
        node.level = 0;
        siblings.push(node);
      } else if (relationship === 'filho' || relationship === 'filha') {
        node.level = 1;
        children.push(node);
        root.children.push(node);
      } else if (relationship === 'cônjuge' || relationship === 'conjuge' || relationship === 'esposo' || relationship === 'esposa') {
        node.level = 0;
        spouse.push(node);
        root.spouse = node;
      } else if (relationship === 'avô' || relationship === 'avo' || relationship === 'avó' || relationship === 'avó') {
        node.level = -2;
        // Find parent to connect grandparent
        const parentOfUser = parents.find(p => true); // Simplified - connect to first parent
        if (parentOfUser) {
          parentOfUser.children.push(node);
        }
      } else if (relationship === 'tio' || relationship === 'tia') {
        node.level = -1;
        // Tios are siblings of parents
        siblings.push(node);
      } else if (relationship === 'sobrinho' || relationship === 'sobrinha') {
        node.level = 1;
        // Sobrinhos are children of siblings
        const sibling = siblings.find(s => true); // Simplified
        if (sibling) {
          sibling.children.push(node);
        }
      }
    });

    // Build parent generation
    if (parents.length > 0) {
      const parentGeneration: TreeNode = {
        id: 'parent-gen',
        name: 'Pais',
        relationship: 'generation',
        children: [root, ...siblings],
        level: -1
      };
      
      parents.forEach(p => {
        if (!parentGeneration.children.includes(p)) {
          p.children.push(root);
        }
      });

      calculateNodePositions(root, parents, siblings, children, spouse);
      setTreeData(root);
    } else {
      calculateNodePositions(root, [], siblings, children, spouse);
      setTreeData(root);
    }
  };

  const calculateNodePositions = (
    root: TreeNode, 
    parents: TreeNode[], 
    siblings: TreeNode[], 
    children: TreeNode[],
    spouse: TreeNode[]
  ) => {
    const nodeWidth = 180;
    const horizontalSpacing = 60;
    const verticalSpacing = 150;
    const centerX = 400;

    // Position root (current user) in the center
    root.x = centerX;
    root.y = 300;

    // Position spouse next to root
    if (root.spouse) {
      root.spouse.x = centerX + nodeWidth + horizontalSpacing;
      root.spouse.y = 300;
    }

    // Position parents above
    if (parents.length > 0) {
      const parentStartX = centerX - ((parents.length - 1) * (nodeWidth + horizontalSpacing)) / 2;
      parents.forEach((parent, idx) => {
        parent.x = parentStartX + idx * (nodeWidth + horizontalSpacing);
        parent.y = 300 - verticalSpacing;
      });
    }

    // Position siblings to the left of root
    if (siblings.length > 0) {
      siblings.forEach((sibling, idx) => {
        sibling.x = centerX - (idx + 1.5) * (nodeWidth + horizontalSpacing);
        sibling.y = 300;
      });
    }

    // Position children below
    if (children.length > 0) {
      const childStartX = centerX - ((children.length - 1) * (nodeWidth + horizontalSpacing)) / 2;
      children.forEach((child, idx) => {
        child.x = childStartX + idx * (nodeWidth + horizontalSpacing);
        child.y = 300 + verticalSpacing;
      });
    }
  };

  const renderGraphView = () => {
    if (!treeData) return null;

    const getAllNodes = (node: TreeNode): TreeNode[] => {
      const nodes = [node];
      if (node.spouse) nodes.push(node.spouse);
      node.children.forEach(child => {
        nodes.push(...getAllNodes(child));
      });
      return nodes;
    };

    const allNodes = getAllNodes(treeData);
    const svgWidth = 1200;
    const svgHeight = 600;

    // Collect all connections
    const connections: Array<{from: TreeNode, to: TreeNode, type: 'parent' | 'spouse' | 'sibling'}> = [];
    
    allNodes.forEach(node => {
      // Parent-child connections
      node.children.forEach(child => {
        connections.push({from: node, to: child, type: 'parent'});
      });
      
      // Spouse connection
      if (node.spouse) {
        connections.push({from: node, to: node.spouse, type: 'spouse'});
      }
    });

    return (
      <div className="w-full overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="mx-auto">
          {/* Draw connections */}
          {connections.map((conn, idx) => {
            const fromX = conn.from.x || 0;
            const fromY = (conn.from.y || 0) + 40;
            const toX = conn.to.x || 0;
            const toY = (conn.to.y || 0) - 10;

            if (conn.type === 'spouse') {
              // Horizontal line for spouse
              return (
                <line
                  key={`spouse-${idx}`}
                  x1={fromX}
                  y1={fromY - 20}
                  x2={toX}
                  y2={fromY - 20}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.5"
                />
              );
            } else {
              // Vertical line for parent-child
              return (
                <g key={`parent-${idx}`}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={fromX}
                    y2={fromY + 30}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                  <line
                    x1={fromX}
                    y1={fromY + 30}
                    x2={toX}
                    y2={fromY + 30}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                  <line
                    x1={toX}
                    y1={fromY + 30}
                    x2={toX}
                    y2={toY}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                </g>
              );
            }
          })}

          {/* Draw nodes */}
          {allNodes.map(node => (
            <g key={node.id} transform={`translate(${(node.x || 0) - 80}, ${(node.y || 0) - 30})`}>
              <rect
                width="160"
                height="80"
                rx="12"
                fill="hsl(var(--card))"
                stroke="hsl(var(--border))"
                strokeWidth="2"
                className="transition-all hover:stroke-primary"
              />
              <foreignObject x="8" y="10" width="50" height="50">
                <Avatar className="w-12 h-12 border-2 border-primary">
                  <AvatarImage src={node.avatar_url} alt={node.name} />
                  <AvatarFallback className="bg-primary/20">
                    <User className="w-6 h-6 text-primary" />
                  </AvatarFallback>
                </Avatar>
              </foreignObject>
              <foreignObject x="60" y="15" width="90" height="60">
                <div className="text-sm">
                  <p className="font-semibold text-foreground truncate">{node.name}</p>
                  {node.relationship !== 'root' && (
                    <p className="text-xs text-muted-foreground capitalize mt-1">{node.relationship}</p>
                  )}
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
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
