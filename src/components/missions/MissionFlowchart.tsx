import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowDown, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MissionFlowchartProps {
  path: any[];
  targetName: string;
}

export const MissionFlowchart = ({ path, targetName }: MissionFlowchartProps) => {
  const { t } = useTranslation();
  const displayPath = Array.isArray(path) && path.length > 0 ? path : [];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        {t("missions.missionRoute")}
      </h3>
      
      <div className="flex flex-col items-center space-y-4">
        {displayPath.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {t("missions.routeWillBuild")}
            </p>
          </div>
        ) : (
          <>
            {displayPath.map((node, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="flex flex-col items-center bg-accent/50 rounded-lg p-4 min-w-[200px]">
                  <Avatar className="h-16 w-16 border-2 border-primary mb-2">
                    <AvatarImage src={node.avatar_url} />
                    <AvatarFallback>{node.name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-center">{node.name}</span>
                  {node.action && (
                    <span className="text-xs text-primary font-medium mt-1">
                      {node.action}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground mt-1">
                    {t("missions.degree")} {index}
                  </span>
                </div>
                {index < displayPath.length - 1 && (
                  <ArrowDown className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            ))}
            
            <ArrowDown className="h-6 w-6 text-muted-foreground my-2" />
            
            <div className="flex flex-col items-center bg-primary/10 rounded-lg p-4 min-w-[200px] border-2 border-primary border-dashed">
              <Target className="h-16 w-16 text-primary mb-2" />
              <span className="font-medium text-center">{targetName}</span>
              <span className="text-xs text-muted-foreground mt-1">
                {t("missions.finalGoal")}
              </span>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};