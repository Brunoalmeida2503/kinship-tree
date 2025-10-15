import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Play } from 'lucide-react';

interface Memory {
  id: string;
  title: string;
  event_date: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export function MemoryCalendar() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

  const memoriesForSelectedDate = memories.filter((memory) =>
    selectedDate ? isSameDay(new Date(memory.event_date), selectedDate) : false
  );

  const datesWithMemories = memories.map((m) => new Date(m.event_date));

  const isVideo = (url: string | null) => {
    if (!url) return false;
    return url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 animate-pulse">
          <div className="h-80 bg-muted rounded" />
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-80 bg-muted rounded" />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            Selecione uma data
          </h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            modifiers={{
              hasMemory: datesWithMemories,
            }}
            modifiersStyles={{
              hasMemory: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              },
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">
            {selectedDate
              ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              : 'Selecione uma data'}
          </h3>

          {memoriesForSelectedDate.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma memória nesta data
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {memoriesForSelectedDate.map((memory) => (
                <Card key={memory.id} className="overflow-hidden">
                  {memory.image_url && (
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      {isVideo(memory.image_url) ? (
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
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground">
                        {memory.title}
                      </h4>
                      <Badge variant="secondary">
                        {format(new Date(memory.event_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </Badge>
                    </div>
                    {memory.description && (
                      <p className="text-sm text-muted-foreground">
                        {memory.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
