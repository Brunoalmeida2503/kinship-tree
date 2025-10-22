import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { memorySchema } from '@/lib/validation';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { MediaUploader, uploadMediaFiles, MediaFile } from '@/components/feed/MediaUploader';
import { Trash2 } from 'lucide-react';

interface EditMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoryId: string;
  onMemoryUpdated: () => void;
}

interface ExistingMedia {
  id: string;
  media_url: string;
  media_type: string;
  display_order: number;
}

export function EditMemoryDialog({ open, onOpenChange, memoryId, onMemoryUpdated }: EditMemoryDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([]);
  const [newMediaFiles, setNewMediaFiles] = useState<MediaFile[]>([]);
  const [deletingMedia, setDeletingMedia] = useState<Set<string>>(new Set());

  const form = useForm<z.infer<typeof memorySchema>>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      title: '',
      description: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
    },
  });

  useEffect(() => {
    if (open && memoryId) {
      loadMemory();
    }
  }, [open, memoryId]);

  const loadMemory = async () => {
    try {
      const { data: memory, error } = await supabase
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
        .eq('id', memoryId)
        .single();

      if (error) throw error;

      form.reset({
        title: memory.title,
        description: memory.description || '',
        start_date: memory.start_date,
        end_date: memory.end_date,
      });

      setExistingMedia(memory.memory_media || []);
    } catch (error) {
      console.error('Erro ao carregar memória:', error);
      toast.error('Erro ao carregar memória');
    }
  };

  const handleDeleteExistingMedia = async (mediaId: string) => {
    setDeletingMedia(prev => new Set(prev).add(mediaId));
    
    try {
      const { error } = await supabase
        .from('memory_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setExistingMedia(prev => prev.filter(m => m.id !== mediaId));
      toast.success('Mídia removida');
    } catch (error) {
      console.error('Erro ao deletar mídia:', error);
      toast.error('Erro ao deletar mídia');
    } finally {
      setDeletingMedia(prev => {
        const next = new Set(prev);
        next.delete(mediaId);
        return next;
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof memorySchema>) => {
    if (!user) return;

    setLoading(true);
    try {
      // Atualizar a memória
      const { error: updateError } = await supabase
        .from('memories')
        .update({
          title: values.title,
          description: values.description,
          start_date: values.start_date,
          end_date: values.end_date,
        })
        .eq('id', memoryId);

      if (updateError) throw updateError;

      // Upload de novas mídias
      if (newMediaFiles.length > 0) {
        const uploadedMedia = await uploadMediaFiles(newMediaFiles, user.id, 'posts');
        
        const nextOrder = existingMedia.length;
        const mediaInserts = uploadedMedia.map((media, index) => ({
          memory_id: memoryId,
          media_url: media.url,
          media_type: media.type,
          display_order: nextOrder + index,
        }));

        const { error: mediaError } = await supabase
          .from('memory_media')
          .insert(mediaInserts);

        if (mediaError) throw mediaError;
      }

      toast.success('Memória atualizada com sucesso!');
      onMemoryUpdated();
      onOpenChange(false);
      setNewMediaFiles([]);
    } catch (error) {
      console.error('Erro ao atualizar memória:', error);
      toast.error('Erro ao atualizar memória');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Memória</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da memória" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte mais sobre essa memória..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {existingMedia.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Mídias Existentes</label>
                <div className="grid grid-cols-3 gap-2">
                  {existingMedia.map((media) => (
                    <div key={media.id} className="relative group">
                      {media.media_type === 'video' ? (
                        <video
                          src={media.media_url}
                          className="w-full h-24 object-cover rounded"
                        />
                      ) : (
                        <img
                          src={media.media_url}
                          alt="Media"
                          className="w-full h-24 object-cover rounded"
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteExistingMedia(media.id)}
                        disabled={deletingMedia.has(media.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Adicionar Novas Mídias</label>
              <MediaUploader
                onMediaChange={setNewMediaFiles}
                maxFiles={10}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
