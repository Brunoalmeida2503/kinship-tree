import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";

interface MissionPathProps {
  path: any[];
  currentDegree: number;
}

export const MissionPath = ({ path, currentDegree }: MissionPathProps) => {
  if (!path || path.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Caminho Percorrido</h3>
      <div className="flex items-center gap-2 flex-wrap">
        {path.map((node, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src={node.avatar_url} />
                <AvatarFallback>{node.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground mt-1">{node.name}</span>
              {node.action && (
                <span className="text-xs text-primary font-medium mt-1">
                  {node.action}
                </span>
              )}
            </div>
            {index < path.length - 1 && (
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};