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
  x?: number;
  y?: number;
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

    const root: TreeNode = {
      id: user.id,
      name: 'Você',
      relationship: 'root',
      avatar_url: currentUserProfile?.avatar_url,
      children: []
    };

    connections.forEach((conn) => {
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const relationship = conn.requester_id === user.id
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;

      root.children.push({
        id: otherPerson.id,
        name: getFirstAndLastName(otherPerson.full_name),
        relationship: relationship,
        avatar_url: otherPerson.avatar_url,
        children: []
      });
    });

    // Calculate positions for graph view
    calculateNodePositions(root);
    setTreeData(root);
  };

  const calculateNodePositions = (node: TreeNode, level: number = 0, index: number = 0) => {
    const nodeWidth = 180;
    const nodeHeight = 100;
    const horizontalSpacing = 40;
    const verticalSpacing = 120;

    if (level === 0) {
      node.x = 400;
      node.y = 50;
    } else {
      const totalWidth = node.children.length * nodeWidth + (node.children.length - 1) * horizontalSpacing;
      node.x = index * (nodeWidth + horizontalSpacing) - totalWidth / 2 + 400;
      node.y = level * verticalSpacing + 50;
    }

    node.children.forEach((child, idx) => {
      calculateNodePositions(child, level + 1, idx);
    });
  };

  const renderGraphView = () => {
    if (!treeData) return null;

    const getAllNodes = (node: TreeNode): TreeNode[] => {
      return [node, ...node.children.flatMap(child => getAllNodes(child))];
    };

    const allNodes = getAllNodes(treeData);
    const svgWidth = 800;
    const svgHeight = Math.max(400, (treeData.children.length + 1) * 150);

    return (
      <div className="w-full overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="mx-auto">
          {/* Draw connections */}
          {allNodes.map(node => 
            node.children.map(child => (
              <g key={`line-${node.id}-${child.id}`}>
                <line
                  x1={node.x}
                  y1={(node.y || 0) + 40}
                  x2={child.x}
                  y2={(child.y || 0) - 10}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  opacity="0.3"
                />
              </g>
            ))
          )}

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
