import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Connection {
  requester_id: string;
  receiver_id: string;
  status: string;
}

interface PathNode {
  userId: string;
  degree: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, targetId, currentDegree } = await req.json();

    // Validate user owns the request
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot query missions for other users' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating path from ${userId} to ${targetId} at degree ${currentDegree}`);

    // Fetch all accepted connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('connections')
      .select('requester_id, receiver_id, status')
      .eq('status', 'accepted');

    if (connectionsError) {
      throw new Error(`Error fetching connections: ${connectionsError.message}`);
    }

    // Build adjacency list
    const graph: Map<string, Set<string>> = new Map();
    
    connections?.forEach((conn: Connection) => {
      if (!graph.has(conn.requester_id)) {
        graph.set(conn.requester_id, new Set());
      }
      if (!graph.has(conn.receiver_id)) {
        graph.set(conn.receiver_id, new Set());
      }
      graph.get(conn.requester_id)!.add(conn.receiver_id);
      graph.get(conn.receiver_id)!.add(conn.requester_id);
    });

    // BFS to find shortest path
    const queue: PathNode[] = [{ userId, degree: 0 }];
    const visited = new Set<string>([userId]);
    const parent = new Map<string, string>();
    let found = false;

    while (queue.length > 0 && !found) {
      const current = queue.shift()!;
      
      if (current.userId === targetId) {
        found = true;
        break;
      }

      if (current.degree >= 6) continue;

      const neighbors = graph.get(current.userId) || new Set();
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, current.userId);
          queue.push({ userId: neighbor, degree: current.degree + 1 });
        }
      }
    }

    // Get suggestions for current degree
    const suggestions: any[] = [];
    
    if (currentDegree === 0) {
      // Direct connections of the user
      const directConnections = graph.get(userId) || new Set();
      
      for (const connId of directConnections) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', connId)
          .single();

        if (profile) {
          // Count common connections with target
          const connNeighbors = graph.get(connId) || new Set();
          const targetNeighbors = graph.get(targetId) || new Set();
          const commonConnections = [...connNeighbors].filter(n => targetNeighbors.has(n)).length;
          
          suggestions.push({
            ...profile,
            connection_strength: commonConnections + 1,
            common_connections: commonConnections,
          });
        }
      }
    } else {
      // Get connections of connections
      const lastInPath = userId; // In a real scenario, this would be the last person in the current path
      const nextLevel = graph.get(lastInPath) || new Set();
      
      for (const connId of nextLevel) {
        if (visited.has(connId)) continue;
        
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', connId)
          .single();

        if (profile) {
          const connNeighbors = graph.get(connId) || new Set();
          const targetNeighbors = graph.get(targetId) || new Set();
          const commonConnections = [...connNeighbors].filter(n => targetNeighbors.has(n)).length;
          
          suggestions.push({
            ...profile,
            connection_strength: commonConnections + 1,
            common_connections: commonConnections,
          });
        }
      }
    }

    // Sort by connection strength and limit to 3
    suggestions.sort((a, b) => b.connection_strength - a.connection_strength);
    const topSuggestions = suggestions.slice(0, 3);

    // Reconstruct path if target found
    let shortestPath: string[] = [];
    if (found) {
      let current = targetId;
      while (current !== userId) {
        shortestPath.unshift(current);
        current = parent.get(current)!;
      }
      shortestPath.unshift(userId);
    }

    console.log(`Found ${topSuggestions.length} suggestions`);
    console.log(`Shortest path: ${shortestPath.length > 0 ? shortestPath.length - 1 : 'not found'} degrees`);

    return new Response(
      JSON.stringify({
        suggestions: topSuggestions,
        shortestPath,
        pathExists: found,
        minDegrees: shortestPath.length > 0 ? shortestPath.length - 1 : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-mission-path:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});