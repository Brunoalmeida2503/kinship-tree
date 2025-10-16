import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Image, Video, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface MediaUploaderProps {
  onMediaChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  existingMedia?: MediaFile[];
}

export function MediaUploader({ onMediaChange, maxFiles = 6, existingMedia = [] }: MediaUploaderProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>(existingMedia);

  const handleMediaSelect = (type: 'image' | 'video') => {
    if (mediaFiles.length >= maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      const remainingSlots = maxFiles - mediaFiles.length;
      const filesToAdd = files.slice(0, remainingSlots);

      if (files.length > remainingSlots) {
        toast.warning(`Apenas ${remainingSlots} arquivo(s) adicionado(s). Máximo de ${maxFiles} permitidos.`);
      }

      const newMediaFiles: MediaFile[] = filesToAdd.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        type
      }));

      const updatedFiles = [...mediaFiles, ...newMediaFiles];
      setMediaFiles(updatedFiles);
      onMediaChange(updatedFiles);
    };

    input.click();
  };

  const handleRemoveMedia = (index: number) => {
    const updatedFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(updatedFiles);
    onMediaChange(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleMediaSelect('image')}
          disabled={mediaFiles.length >= maxFiles}
        >
          <Image className="h-4 w-4 mr-2" />
          Foto
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleMediaSelect('video')}
          disabled={mediaFiles.length >= maxFiles}
        >
          <Video className="h-4 w-4 mr-2" />
          Vídeo
        </Button>
        <span className="text-sm text-muted-foreground self-center ml-auto">
          {mediaFiles.length}/{maxFiles}
        </span>
      </div>

      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {mediaFiles.map((media, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
              {media.type === 'image' ? (
                <img
                  src={media.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={media.preview}
                  className="w-full h-full object-cover"
                  controls={false}
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveMedia(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function uploadMediaFiles(
  files: MediaFile[],
  userId: string,
  bucket: 'posts' | 'avatars' = 'posts'
): Promise<Array<{ url: string; type: 'image' | 'video' }>> {
  const uploadedMedia: Array<{ url: string; type: 'image' | 'video' }> = [];

  for (const mediaFile of files) {
    try {
      const fileExt = mediaFile.file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, mediaFile.file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      uploadedMedia.push({ url: publicUrl, type: mediaFile.type });
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  }

  return uploadedMedia;
}