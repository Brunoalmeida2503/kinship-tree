import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, Users } from "lucide-react";
import { useEffect } from "react";

interface MissionRitualProps {
  mission: any;
  onClose: () => void;
}

export const MissionRitual = ({ mission, onClose }: MissionRitualProps) => {
  useEffect(() => {
    // Confetti animation would go here
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/20 via-background to-accent/20">
      <Card className="max-w-2xl w-full p-12 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Trophy className="h-24 w-24 text-primary animate-bounce" />
              <Sparkles className="h-8 w-8 text-accent absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Missão Cumprida!
          </h1>
          <p className="text-xl text-muted-foreground">
            Você conseguiu se conectar com{" "}
            <span className="font-semibold text-foreground">
              {mission.target_profile?.full_name}
            </span>
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4 p-6 bg-primary/10 rounded-lg">
            <Users className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="text-sm text-muted-foreground">Graus de separação</p>
              <p className="text-3xl font-bold text-primary">{mission.current_degree}</p>
            </div>
          </div>

          <div className="p-6 bg-accent/10 rounded-lg space-y-2">
            <p className="text-sm font-medium">🌟 Ritual de Celebração 🌟</p>
            <p className="text-muted-foreground">
              Você provou que somos todos mais conectados do que imaginamos. A teoria dos Seis
              Graus de Separação se manifesta mais uma vez!
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button size="lg" className="w-full" onClick={onClose}>
            Começar Nova Missão
          </Button>
          <p className="text-xs text-muted-foreground">
            "Em um mundo conectado, ninguém está realmente distante"
          </p>
        </div>
      </Card>
    </div>
  );
};