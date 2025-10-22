import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, Upload, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { memorySchema } from '@/lib/validation';
import { z } from 'zod';

interface AddMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemoryDialog({ open, onOpenChange }: AddMemoryDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isPeriod, setIsPeriod] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const uploadMedia = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    try {
      memorySchema.parse({
        title,
        description,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        end_date: isPeriod && endDate ? format(endDate, 'yyyy-MM-dd') : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (!title.trim() || !startDate) {
      toast.error('Preencha o título e a data inicial');
      return;
    }

    if (isPeriod && !endDate) {
      toast.error('Preencha a data final do período');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      let imageUrl = null;
      if (mediaFile) {
        imageUrl = await uploadMedia(mediaFile, user.id);
      }

      const { error } = await supabase.from('memories').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: isPeriod && endDate ? format(endDate, 'yyyy-MM-dd') : null,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast.success('Memória criada com sucesso!');
      onOpenChange(false);
      resetForm();
      window.location.reload();
    } catch (error) {
      console.error('Erro ao criar memória:', error);
      toast.error('Erro ao criar memória');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setIsPeriod(false);
    setMediaFile(null);
    setMediaPreview(null);
  };

  const isVideo = mediaFile?.type.startsWith('video/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova Memória</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Memória *</Label>
            <Input
              id="title"
              placeholder="Ex: Natal em Família"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="is-period"
                checked={isPeriod}
                onCheckedChange={(checked) => setIsPeriod(checked as boolean)}
              />
              <Label htmlFor="is-period" className="cursor-pointer text-sm">
                Período (data inicial e final)
              </Label>
            </div>

            <Label>{isPeriod ? 'Data Inicial *' : 'Data do Evento *'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  locale={ptBR}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {isPeriod && (
            <div className="space-y-2">
              <Label>Data Final *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ptBR}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Conte mais sobre essa memória especial..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto ou Vídeo</Label>
            {mediaPreview ? (
              <div className="relative">
                {isVideo ? (
                  <video src={mediaPreview} className="w-full rounded-lg max-h-64" controls />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <Label htmlFor="media" className="cursor-pointer">
                  <span className="text-sm text-primary hover:underline">
                    Clique para selecionar
                  </span>
                  <Input
                    id="media"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaSelect}
                  />
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, MP4 ou WEBM
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Criar Memória'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
