import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Target, GitBranch, Map as MapIcon } from "lucide-react";
import { MissionFlowchart } from "@/components/missions/MissionFlowchart";
import { MissionMap } from "@/components/missions/MissionMap";
import { Badge } from "@/components/ui/badge";

interface Mission {
  id: string;
  target_id: string;
  current_degree: number;
  status: string;
  path: any;
  created_at: string;
  completed_at: string | null;
  target_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

const MissionExplore = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      loadMission();
    }
  }, [user, id]);

  const loadMission = async () => {
    if (!user || !id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error loading mission:", error);
      navigate("/missions/history");
      return;
    }

    if (data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.target_id)
        .single();
      
      setMission({ ...data, target_profile: profile } as Mission);
    }
    setLoading(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completada";
      case "active":
        return "Ativa";
      default:
        return "Abandonada";
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "completed":
        return "default";
      case "active":
        return "secondary";
      default:
        return "destructive";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Carregando missão...</div>
      </div>
    );
  }

  if (!mission) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/missions/history")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Explorar Missão
          </h1>
          <p className="text-muted-foreground mt-1">
            Missão para {mission.target_profile?.full_name}
          </p>
        </div>
        <Badge variant={getStatusVariant(mission.status)}>
          {getStatusLabel(mission.status)}
        </Badge>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Progresso da Missão</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Grau alcançado: {mission.current_degree} de 6
            </p>
          </div>
          <div className="text-4xl font-bold text-primary">
            {mission.current_degree}/6
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
            path={mission.path || []} 
            targetName={mission.target_profile?.full_name || "Alvo"}
          />
        </TabsContent>
        <TabsContent value="map" className="mt-6">
          <MissionMap 
            path={mission.path || []}
            targetProfile={mission.target_profile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MissionExplore;
