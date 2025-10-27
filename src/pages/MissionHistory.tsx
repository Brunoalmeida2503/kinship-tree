import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, CheckCircle, XCircle, Clock, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricalMission {
  id: string;
  target_id: string;
  current_degree: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  target_profile?: {
    full_name: string;
    avatar_url: string;
  };
}

const MissionHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [missions, setMissions] = useState<HistoricalMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMissionHistory();
    }
  }, [user]);

  const loadMissionHistory = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading mission history:", error);
    } else if (data) {
      // Fetch all target profiles
      const targetIds = data.map((m: any) => m.target_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", targetIds);
      
      // Map profiles to missions
      const missionsWithProfiles = data.map((mission: any) => ({
        ...mission,
        target_profile: profiles?.find((p) => p.id === mission.target_id)
      }));
      
      setMissions(missionsWithProfiles as any);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "active":
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
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

  const handleDeleteClick = (missionId: string) => {
    setMissionToDelete(missionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!missionToDelete) return;

    const { error } = await supabase
      .from("missions")
      .delete()
      .eq("id", missionToDelete);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a missão.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Missão excluída",
        description: "A missão foi removida do histórico.",
      });
      setMissions(missions.filter(m => m.id !== missionToDelete));
    }

    setDeleteDialogOpen(false);
    setMissionToDelete(null);
  };

  const handleExplore = (missionId: string) => {
    navigate(`/missions/${missionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Carregando histórico...</div>
      </div>
    );
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
            Histórico de Missões
          </h1>
          <p className="text-muted-foreground mt-1">
            Todas as suas missões anteriores
          </p>
        </div>
      </div>

      {missions.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Nenhuma missão ainda</h2>
          <p className="text-muted-foreground mb-6">
            Comece uma nova missão para ver seu histórico aqui
          </p>
          <Button onClick={() => navigate("/missions")}>
            Iniciar Missão
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {missions.map((mission) => (
            <Card key={mission.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={mission.target_profile?.avatar_url} />
                    <AvatarFallback>
                      {mission.target_profile?.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">
                        {mission.target_profile?.full_name || "Usuário desconhecido"}
                      </h3>
                      {getStatusIcon(mission.status)}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant={getStatusVariant(mission.status)}>
                        {getStatusLabel(mission.status)}
                      </Badge>
                      <Badge variant="outline">
                        Grau: {mission.current_degree}/6
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Iniciada {formatDistanceToNow(new Date(mission.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                      {mission.completed_at && (
                        <span className="ml-2">
                          • Completada {formatDistanceToNow(new Date(mission.completed_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExplore(mission.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Explorar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(mission.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir missão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta missão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MissionHistory;
