import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from 'lucide-react';

interface GroupMemoryCardProps {
  memory: {
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
    group_memory_media: Array<{
      id: string;
      media_url: string;
      media_type: string;
      display_order: number;
    }>;
  };
  onUpdate: () => void;
  canEdit: boolean;
}

export function GroupMemoryCard({ memory }: GroupMemoryCardProps) {
  const firstMedia = memory.group_memory_media.sort((a, b) => a.display_order - b.display_order)[0];

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {firstMedia && (
        <div className="aspect-video relative overflow-hidden bg-muted">
          {firstMedia.media_type === 'image' ? (
            <img
              src={firstMedia.media_url}
              alt={memory.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={firstMedia.media_url}
              className="w-full h-full object-cover"
            />
          )}
          {memory.group_memory_media.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
              +{memory.group_memory_media.length - 1}
            </div>
          )}
        </div>
      )}
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2">{memory.title}</h3>
        {memory.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {memory.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Calendar className="h-4 w-4" />
          <span>
            {new Date(memory.start_date).toLocaleDateString('pt-BR')}
            {memory.end_date && ` - ${new Date(memory.end_date).toLocaleDateString('pt-BR')}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={memory.profiles.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {memory.profiles.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {memory.profiles.full_name}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
