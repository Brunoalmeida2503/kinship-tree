import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

interface AddGroupMemoryDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemoryAdded: () => void;
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export function AddGroupMemoryDialog({
  groupId,
  open,
  onOpenChange,
  onMemoryAdded,
}: AddGroupMemoryDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [creating, setCreating] = useState(false);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newMediaFiles = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
    }));
    setMediaFiles([...mediaFiles, ...newMediaFiles]);
  };

  const removeMedia = (index: number) => {
    const newFiles = [...mediaFiles];
    URL.revokeObjectURL(newFiles[index].preview);
    newFiles.splice(index, 1);
    setMediaFiles(newFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !startDate) return;

    setCreating(true);
    try {
      const { data: memory, error: memoryError } = await supabase
        .from('group_memories')
        .insert({
          group_id: groupId,
          user_id: user.id,
          title,
          description,
          start_date: startDate,
          end_date: endDate || null,
        })
        .select()
        .single();

      if (memoryError) throw memoryError;

      if (mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const media = mediaFiles[i];
          const fileExt = media.file.name.split('.').pop();
          const fileName = `${memory.id}/${Date.now()}_${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, media.file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);

          const { error: mediaError } = await supabase
            .from('group_memory_media')
            .insert({
              group_memory_id: memory.id,
              media_url: publicUrl,
              media_type: media.type,
              display_order: i,
            });

          if (mediaError) throw mediaError;
        }
      }

      toast.success('Memória criada com sucesso!');
      resetForm();
      onMemoryAdded();
    } catch (error) {
      console.error('Error creating group memory:', error);
      toast.error('Erro ao criar memória');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
    setMediaFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Memória do Grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data de Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Fotos e Vídeos</Label>
            <div className="mt-2">
              <label className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para adicionar fotos ou vídeos
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleMediaSelect}
                />
              </label>
            </div>

            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {mediaFiles.map((media, index) => (
                  <div key={index} className="relative group">
                    {media.type === 'image' ? (
                      <img
                        src={media.preview}
                        alt={`Preview ${index}`}
                        className="w-full h-24 object-cover rounded"
                      />
                    ) : (
                      <video
                        src={media.preview}
                        className="w-full h-24 object-cover rounded"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Criando...' : 'Criar Memória'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
