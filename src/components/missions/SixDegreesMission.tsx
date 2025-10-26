import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Target, Users, Send, MessageCircle, UserPlus } from "lucide-react";
import { StartMissionDialog } from "./StartMissionDialog";
import { MissionPath } from "./MissionPath";
import { MissionSuggestions } from "./MissionSuggestions";
import { MissionRitual } from "./MissionRitual";

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

export const SixDegreesMission = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRitual, setShowRitual] = useState(false);

  useEffect(() => {
    if (user) {
      loadActiveMission();
    }
  }, [user]);

  const loadActiveMission = async () => {
    if (!user) return;

    const { data: missions, error } = await supabase
      .from("missions")
      .select(`
        *,
        target_profile:profiles!target_id(full_name, avatar_url)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error loading mission:", error);
      return;
    }

    if (missions && missions.length > 0) {
      const mission: any = missions[0];
      setActiveMission(mission);
      await loadSuggestions(mission.id, mission.current_degree);
    }
  };

  const loadSuggestions = async (missionId: string, currentDegree: number) => {
    const { data, error } = await supabase
      .from("mission_suggestions")
      .select(`
        id,
        suggested_user_id,
        connection_strength,
        common_connections,
        suggested_profile:profiles!suggested_user_id(id, full_name, avatar_url)
      `)
      .eq("mission_id", missionId)
      .eq("degree", currentDegree)
      .order("connection_strength", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error loading suggestions:", error);
      return;
    }

    if (data) {
      const formattedSuggestions = data.map((s: any) => ({
        id: s.suggested_profile.id,
        full_name: s.suggested_profile.full_name,
        avatar_url: s.suggested_profile.avatar_url,
        connection_strength: s.connection_strength,
        common_connections: s.common_connections,
      }));
      setSuggestions(formattedSuggestions);
    }
  };

  const startMission = async (targetId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Create mission
      const { data: mission, error: missionError } = await supabase
        .from("missions")
        .insert({
          user_id: user.id,
          target_id: targetId,
          current_degree: 0,
          status: "active",
        })
        .select()
        .single();

      if (missionError) throw missionError;

      // Calculate path and suggestions
      const response = await supabase.functions.invoke("calculate-mission-path", {
        body: {
          userId: user.id,
          targetId,
          currentDegree: 0,
        },
      });

      if (response.error) throw response.error;

      const { suggestions: calculatedSuggestions } = response.data;

      // Save suggestions
      if (calculatedSuggestions && calculatedSuggestions.length > 0) {
        const suggestionInserts = calculatedSuggestions.map((s: any) => ({
          mission_id: mission.id,
          suggested_user_id: s.id,
          degree: 0,
          connection_strength: s.connection_strength,
          common_connections: s.common_connections,
        }));

        await supabase.from("mission_suggestions").insert(suggestionInserts);
      }

      toast({
        title: "Missão iniciada!",
        description: "Comece sua jornada de 6 graus de separação.",
      });

      await loadActiveMission();
    } catch (error) {
      console.error("Error starting mission:", error);
      toast({
        title: "Erro ao iniciar missão",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

      // Check if this creates a connection to target
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

    setShowRitual(true);
  };

  const closeRitual = () => {
    setShowRitual(false);
    setActiveMission(null);
    setSuggestions([]);
  };

  if (showRitual && activeMission) {
    return <MissionRitual mission={activeMission} onClose={closeRitual} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Seis Graus de Separação
          </h1>
          <p className="text-muted-foreground mt-2">
            Conecte-se com qualquer pessoa em até 6 elos
          </p>
        </div>
        {!activeMission && <StartMissionDialog onStart={startMission} loading={loading} />}
      </div>

      {activeMission ? (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-xl font-semibold">Missão Ativa</h2>
                <p className="text-sm text-muted-foreground">
                  Conectando com {activeMission.target_profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Grau atual:</span>
              <span className="text-2xl font-bold text-primary">
                {activeMission.current_degree}
              </span>
              <span className="text-muted-foreground">/ 6</span>
            </div>
          </Card>

          <MissionPath path={activeMission.path} currentDegree={activeMission.current_degree} />

          <MissionSuggestions
            suggestions={suggestions}
            onAction={recordAction}
            activeMission={activeMission}
          />
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Nenhuma missão ativa</h2>
          <p className="text-muted-foreground mb-6">
            Inicie uma nova missão e tente alcançar alguém em até 6 graus de separação
          </p>
          <StartMissionDialog onStart={startMission} loading={loading} />
        </Card>
      )}
    </div>
  );
};