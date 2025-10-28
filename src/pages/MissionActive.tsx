import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Target, GitBranch, Map as MapIcon } from "lucide-react";
import { MissionFlowchart } from "@/components/missions/MissionFlowchart";
import { MissionMap } from "@/components/missions/MissionMap";
import { MissionSuggestions } from "@/components/missions/MissionSuggestions";
import { useToast } from "@/hooks/use-toast";

interface Mission {
  id: string;
  target_id: string;
  current_degree: number;
  status: string;
  path: any;
  target_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

interface Suggestion {
  id: string;
  full_name: string;
  avatar_url: string;
  connection_strength: number;
  common_connections: number;
}

const MissionActive = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadActiveMission();
    }
  }, [user]);

  const loadActiveMission = async () => {
    if (!user) return;

    setLoading(true);
    const { data: missions, error } = await supabase
      .from("missions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error loading mission:", error);
      setLoading(false);
      return;
    }

    if (missions && missions.length > 0) {
      const mission: any = missions[0];
      
      // Fetch target profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", mission.target_id)
        .single();
      
      mission.target_profile = profile;
      setActiveMission(mission);
      await loadSuggestions(mission.id, mission.current_degree);
    } else {
      navigate("/missions");
    }
    setLoading(false);
  };

  const loadSuggestions = async (missionId: string, currentDegree: number) => {
    const { data, error } = await supabase
      .from("mission_suggestions")
      .select("id, suggested_user_id, connection_strength, common_connections")
      .eq("mission_id", missionId)
      .eq("degree", currentDegree)
      .order("connection_strength", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error loading suggestions:", error);
      return;
    }

    if (data && data.length > 0) {
      // Fetch profiles separately
      const userIds = data.map((s: any) => s.suggested_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profiles) {
        const formattedSuggestions = data.map((s: any) => {
          const profile = profiles.find((p) => p.id === s.suggested_user_id);
          return {
            id: s.suggested_user_id,
            full_name: profile?.full_name || "Desconhecido",
            avatar_url: profile?.avatar_url || "",
            connection_strength: s.connection_strength,
            common_connections: s.common_connections,
          };
        });
        setSuggestions(formattedSuggestions);
      }
    }
  };

  const recordAction = async (actionType: string, targetUserId: string) => {
    if (!activeMission) return;

    try {
      await supabase.from("mission_actions").insert({
        mission_id: activeMission.id,
        action_type: actionType,
        target_user_id: targetUserId,
        degree: activeMission.current_degree,
      });

      toast({
        title: "Ação registrada!",
        description: `${actionType} enviado com sucesso.`,
      });

      if (targetUserId === activeMission.target_id) {
        await completeMission();
      }
    } catch (error) {
      console.error("Error recording action:", error);
    }
  };

  const completeMission = async () => {
    if (!activeMission) return;

    await supabase
      .from("missions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", activeMission.id);

    toast({
      title: "Missão Completada!",
      description: "Parabéns! Você alcançou seu objetivo.",
    });

    navigate("/missions/history");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Carregando missão...</div>
      </div>
    );
  }

  if (!activeMission) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/missions")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Missão Ativa
          </h1>
          <p className="text-muted-foreground mt-1">
            Conectando com {activeMission.target_profile?.full_name}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Progresso</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Você está no grau {activeMission.current_degree} de 6
            </p>
          </div>
          <div className="text-4xl font-bold text-primary">
            {activeMission.current_degree}/6
          </div>
        </div>
      </Card>

      <Tabs defaultValue="flowchart" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flowchart" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Fluxograma
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            Mapa
          </TabsTrigger>
        </TabsList>
        <TabsContent value="flowchart" className="mt-6">
          <MissionFlowchart 
            path={activeMission.path || []} 
            targetName={activeMission.target_profile?.full_name || "Alvo"}
          />
        </TabsContent>
        <TabsContent value="map" className="mt-6">
          <MissionMap 
            path={activeMission.path || []}
            targetProfile={activeMission.target_profile}
          />
        </TabsContent>
      </Tabs>

      <MissionSuggestions
        suggestions={suggestions}
        onAction={recordAction}
        activeMission={activeMission}
      />
    </div>
  );
};

export default MissionActive;
