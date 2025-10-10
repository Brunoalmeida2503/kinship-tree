import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TreeNode {
  id: string;
  name: string;
  relationship: string;
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
        requester:requester_id(id, full_name),
        receiver:receiver_id(id, full_name)
      `)
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (!error && data) {
      buildTree(data);
    }
  };

  const buildTree = (connections: any[]) => {
    if (!user) return;

    const root: TreeNode = {
      id: user.id,
      name: 'Você',
      relationship: 'root',
      children: []
    };

    connections.forEach((conn) => {
      const otherPerson = conn.requester_id === user.id ? conn.receiver : conn.requester;
      const relationship = conn.requester_id === user.id
        ? conn.relationship_from_requester
        : conn.relationship_from_receiver;

      root.children.push({
        id: otherPerson.id,
        name: otherPerson.full_name,
        relationship: relationship,
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
              <circle
                cx="30"
                cy="30"
                r="18"
                fill="hsl(var(--primary))"
                opacity="0.2"
              />
              <foreignObject x="50" y="15" width="100" height="60">
                <div className="text-sm">
                  <p className="font-semibold text-foreground truncate">{node.name}</p>
                  {node.relationship !== 'root' && (
                    <p className="text-xs text-muted-foreground capitalize mt-1">{node.relationship}</p>
                  )}
                </div>
              </foreignObject>
              <User
                className="absolute"
                style={{ left: '18px', top: '18px' }}
                size={16}
                color="hsl(var(--primary))"
              />
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
