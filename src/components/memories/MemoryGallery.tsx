import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Play, Share2, Image as ImageIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { ShareMemoryDialog } from './ShareMemoryDialog';
import { EditMemoryDialog } from './EditMemoryDialog';

interface MediaItem {
  id: string;
  media_url: string;
  media_type: string;
  display_order: number;
}

interface Memory {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  memory_media: MediaItem[];
}

// Parse YYYY-MM-DD as local date to avoid UTC timezone shift
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface MemoryGalleryProps {
  filterDate?: Date;
  onClearFilter?: () => void;
}

export function MemoryGallery({ filterDate, onClearFilter }: MemoryGalleryProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select(`
          *,
          memory_media(
            id,
            media_url,
            media_type,
            display_order
          )
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Erro ao carregar memórias:', error);
      toast.error('Erro ao carregar memórias');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (memoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemoryId(memoryId);
    setShareDialogOpen(true);
  };

  const handleEdit = (memoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMemoryId(memoryId);
    setEditDialogOpen(true);
  };

  const getFirstMedia = (memory: Memory) => {
    if (memory.memory_media && memory.memory_media.length > 0) {
      const sortedMedia = [...memory.memory_media].sort((a, b) => a.display_order - b.display_order);
      return sortedMedia[0];
    }
    return null;
  };

  // Filter memories by date if filterDate is set
  const filteredMemories = filterDate
    ? memories.filter((memory) => {
        const start = parseLocalDate(memory.start_date);
        const end = memory.end_date ? parseLocalDate(memory.end_date) : start;
        return filterDate >= start && filterDate <= end;
      })
    : memories;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="aspect-square bg-muted" />
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground text-lg">
          Nenhuma memória adicionada ainda.
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Clique em "Nova Memória" para começar!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filterDate && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 text-sm py-1 px-3">
            <Calendar className="h-3 w-3" />
            {format(filterDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClearFilter} className="h-7 gap-1 text-xs text-muted-foreground">
            <X className="h-3 w-3" />
            Limpar filtro
          </Button>
        </div>
      )}
      {filteredMemories.length === 0 && filterDate && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">Nenhuma memória nesta data.</p>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMemories.map((memory) => {
          const firstMedia = getFirstMedia(memory);
          const mediaCount = memory.memory_media?.length || 0;
          
          return (
            <Card 
              key={memory.id} 
              className="overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={(e) => handleEdit(memory.id, e)}
            >
              <div className="aspect-square relative overflow-hidden bg-muted">
                {firstMedia ? (
                  firstMedia.media_type === 'video' ? (
                    <div className="relative w-full h-full">
                      <video
                        src={firstMedia.media_url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={firstMedia.media_url}
                      alt={memory.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Calendar className="h-16 w-16 text-primary" />
                  </div>
                )}
                {mediaCount > 1 && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {mediaCount}
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-foreground line-clamp-1 flex-1">
                    {memory.title}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => handleShare(memory.id, e)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <Badge variant="secondary" className="mb-2">
                  {memory.end_date && memory.start_date !== memory.end_date
                    ? `${format(parseLocalDate(memory.start_date), 'dd/MM/yyyy')} - ${format(parseLocalDate(memory.end_date), 'dd/MM/yyyy')}`
                    : format(parseLocalDate(memory.start_date), 'dd/MM/yyyy')}
                </Badge>
                {memory.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {memory.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        
        {selectedMemoryId && (
          <>
            <ShareMemoryDialog
              open={shareDialogOpen}
              onOpenChange={setShareDialogOpen}
              memoryId={selectedMemoryId}
            />
            <EditMemoryDialog
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
              memoryId={selectedMemoryId}
              onMemoryUpdated={fetchMemories}
            />
          </>
        )}
      </div>
    </div>
  );
}

