import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TreePine } from 'lucide-react';

interface TreeNode {
  id: string;
  name: string;
  relationship: string;
  children: TreeNode[];
}

export function TreeVisualization() {
  const { user } = useAuth();
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [connections, setConnections] = useState<any[]>([]);

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
      setConnections(data);
      buildTree(data);
    }
  };

  const buildTree = (connections: any[]) => {
    if (!user) return;

    // Build a simple tree structure
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

    setTreeData(root);
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
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
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreePine className="h-6 w-6" />
          Sua Árvore Genealógica
        </CardTitle>
        <CardDescription>
          Visualização da sua rede de conexões familiares
        </CardDescription>
      </CardHeader>
      <CardContent>
        {treeData ? (
          <div className="overflow-x-auto">
            {renderNode(treeData)}
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
