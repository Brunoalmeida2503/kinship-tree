import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MediaUploader, uploadMediaFiles } from '@/components/feed/MediaUploader';
import { MediaGallery } from '@/components/feed/MediaGallery';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GroupPostComments } from './GroupPostComments';

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface GroupPost {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  group_post_media?: Array<{
    media_url: string;
    media_type: 'image' | 'video';
    display_order: number;
  }>;
}

interface GroupFeedProps {
  groupId: string;
}

export function GroupFeed({ groupId }: GroupFeedProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [groupId]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('group_posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (
            full_name,
            avatar_url
          ),
          group_post_media (
            media_url,
            media_type,
            display_order
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data || []) as GroupPost[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user) return;

    setCreating(true);
    try {
      const { data: postData, error: postError } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: newPost.trim()
        })
        .select()
        .single();

      if (postError) throw postError;

      if (mediaFiles.length > 0) {
        const uploadedMedia = await uploadMediaFiles(mediaFiles, user.id);
        
        const mediaInserts = uploadedMedia.map((media, index) => ({
          group_post_id: postData.id,
          media_url: media.url,
          media_type: media.type,
          display_order: index
        }));

        const { error: mediaError } = await supabase
          .from('group_post_media')
          .insert(mediaInserts);

        if (mediaError) throw mediaError;
      }

      setNewPost('');
      setMediaFiles([]);
      fetchPosts();
      toast.success('Post criado');
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Erro ao criar post');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <Avatar>
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback>
                {user?.user_metadata?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Compartilhe algo com o grupo..."
                className="min-h-[100px]"
              />
              <MediaUploader
                onMediaChange={setMediaFiles}
                maxFiles={6}
                existingMedia={mediaFiles}
              />
              <Button
                onClick={handleCreatePost}
                disabled={!newPost.trim() || creating}
                className="w-full sm:w-auto"
              >
                Publicar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma postagem ainda. Seja o primeiro a compartilhar!
            </p>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarImage src={post.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {post.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {post.profiles?.full_name || 'Usuário'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                
                {post.group_post_media && post.group_post_media.length > 0 && (
                  <MediaGallery
                    media={post.group_post_media
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(m => ({ url: m.media_url, type: m.media_type }))}
                  />
                )}

                <GroupPostComments postId={post.id} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}