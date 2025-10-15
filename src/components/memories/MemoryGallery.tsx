import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Memory {
  id: string;
  title: string;
  event_date: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export function MemoryGallery() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error) {
      console.error('Erro ao carregar memórias:', error);
      toast.error('Erro ao carregar memórias');
    } finally {
      setLoading(false);
    }
  };

  const isVideo = (url: string | null) => {
    if (!url) return false;
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  };

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {memories.map((memory) => (
        <Card 
          key={memory.id} 
          className="overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
        >
          <div className="aspect-square relative overflow-hidden bg-muted">
            {memory.image_url ? (
              isVideo(memory.image_url) ? (
                <div className="relative w-full h-full">
                  <video
                    src={memory.image_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={memory.image_url}
                  alt={memory.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <Calendar className="h-16 w-16 text-primary" />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
              {memory.title}
            </h3>
            <Badge variant="secondary" className="mb-2">
              {format(new Date(memory.event_date), 'dd/MM/yyyy', { locale: ptBR })}
            </Badge>
            {memory.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {memory.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
