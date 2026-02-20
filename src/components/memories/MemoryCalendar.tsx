import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, parseISO, isSameDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Play, ArrowRight } from 'lucide-react';

interface Memory {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

interface MemoryCalendarProps {
  onNavigateToGallery?: (date: Date) => void;
}

// Parse YYYY-MM-DD as local date (avoids UTC timezone shift)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function MemoryCalendar({ onNavigateToGallery }: MemoryCalendarProps) {
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

  // Collect ALL dates covered by each memory range (using local date parsing)
  const datesWithMemories: Date[] = [];
  memories.forEach((memory) => {
    const start = parseLocalDate(memory.start_date);
    const end = memory.end_date ? parseLocalDate(memory.end_date) : start;
    const days = eachDayOfInterval({ start, end });
    datesWithMemories.push(...days);
  });

  const memoriesForSelectedDate = memories.filter((memory) => {
    if (!selectedDate) return false;
    const start = parseLocalDate(memory.start_date);
    const end = memory.end_date ? parseLocalDate(memory.end_date) : start;
    // Check if selectedDate falls within [start, end]
    return selectedDate >= start && selectedDate <= end;
  });

  const hasMemoriesOnSelected = memoriesForSelectedDate.length > 0;

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
                borderRadius: '50%',
              },
            }}
            className="rounded-md border pointer-events-auto"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              {selectedDate
                ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                : 'Selecione uma data'}
            </h3>
            {hasMemoriesOnSelected && onNavigateToGallery && selectedDate && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => onNavigateToGallery(selectedDate)}
              >
                Ver na galeria
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>

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
                      <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                        {memory.end_date
                          ? `${format(parseLocalDate(memory.start_date), 'dd/MM/yyyy')} – ${format(parseLocalDate(memory.end_date), 'dd/MM/yyyy')}`
                          : format(parseLocalDate(memory.start_date), 'dd/MM/yyyy')
                        }
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
