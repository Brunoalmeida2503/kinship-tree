import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MediaUploader, uploadMediaFiles } from './MediaUploader';
import { MediaGallery } from './MediaGallery';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface EditPostDialogProps {
  post: {
    id: string;
    content: string;
    media?: Array<{ url: string; type: 'image' | 'video' }>;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPostDialog({ post, open, onOpenChange, onSuccess }: EditPostDialogProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<Array<{ file: File; preview: string; type: 'image' | 'video' }>>([]);
  const [existingMedia, setExistingMedia] = useState<Array<{ url: string; type: 'image' | 'video' }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post) {
      setContent(post.content);
      setExistingMedia(post.media || []);
      setMediaFiles([]);
    }
  }, [post]);

  const handleRemoveExistingMedia = (url: string) => {
    setExistingMedia(existingMedia.filter(m => m.url !== url));
  };

  const handleSave = async () => {
    if (!post || !user) return;

    setSaving(true);
    try {
      // Update post content
      const { error: updateError } = await supabase
        .from('posts')
        .update({ content })
        .eq('id', post.id);

      if (updateError) throw updateError;

      // Delete removed media from database
      const removedUrls = post.media?.filter(m => !existingMedia.find(em => em.url === m.url)).map(m => m.url) || [];
      if (removedUrls.length > 0) {
        const { error: deleteError } = await supabase
          .from('post_media')
          .delete()
          .eq('post_id', post.id)
          .in('media_url', removedUrls);

        if (deleteError) throw deleteError;

        // Delete from storage
        for (const url of removedUrls) {
          const path = url.split('/posts/')[1];
          if (path) {
            await supabase.storage.from('posts').remove([path]);
          }
        }
      }

      // Upload new media
      if (mediaFiles.length > 0) {
        const uploadedMedia = await uploadMediaFiles(mediaFiles, user.id, 'posts');
        
        const mediaData = uploadedMedia.map((media, index) => ({
          post_id: post.id,
          media_url: media.url,
          media_type: media.type,
          display_order: existingMedia.length + index
        }));

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaData);

        if (mediaError) throw mediaError;
      }

      toast.success('Post atualizado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Erro ao atualizar post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px]"
            placeholder="Edite seu post..."
          />

          {existingMedia.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Mídia existente</p>
              <div className="relative">
                <MediaGallery media={existingMedia} />
                <div className="absolute top-2 right-2 flex flex-wrap gap-2">
                  {existingMedia.map((media, index) => (
                    <Button
                      key={index}
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveExistingMedia(media.url)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">Adicionar nova mídia</p>
            <MediaUploader 
              onMediaChange={setMediaFiles}
              maxFiles={6 - existingMedia.length}
              existingMedia={mediaFiles}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
