import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, UserPlus, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Suggestion {
  id: string;
  full_name: string;
  avatar_url: string;
  connection_strength: number;
  common_connections: number;
}

interface MissionSuggestionsProps {
  suggestions: Suggestion[];
  onAction: (actionType: string, targetUserId: string) => Promise<void>;
  activeMission: any;
}

export const MissionSuggestions = ({ suggestions, onAction, activeMission }: MissionSuggestionsProps) => {
  const { t } = useTranslation();
  
  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">
          {t("missions.noSuggestions")}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{t("missions.suggestionsTitle")}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("missions.suggestionsDescription")}
      </p>
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <Avatar className="h-14 w-14">
              <AvatarImage src={suggestion.avatar_url} />
              <AvatarFallback>{suggestion.full_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold">{suggestion.full_name}</h4>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {suggestion.common_connections} {t("missions.commonConnections")}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t("missions.strength")}: {suggestion.connection_strength}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction("message", suggestion.id)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction("invite", suggestion.id)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => onAction("connection", suggestion.id)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};