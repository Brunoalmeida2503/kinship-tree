import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Image, Video, X, Users, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  user_id: string;
  share_with_tree: boolean;
  author_name?: string;
  author_avatar?: string | null;
}

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
}

const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [shareWithTree, setShareWithTree] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPosts();
    fetchUserGroups();
  }, [user, navigate]);

  const fetchUserGroups = async () => {
    if (!user) return;
    
    try {
      const { data: groupMembers, error: membersError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (membersError) throw membersError;

      const groupIds = groupMembers?.map(gm => gm.group_id) || [];
      
      if (groupIds.length === 0) {
        setUserGroups([]);
        return;
      }

      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("id, name, avatar_url")
        .in("id", groupIds);

      if (groupsError) throw groupsError;

      setUserGroups(groups || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      if (!user) return;

      // Get user's connections (accepted only)
      const { data: connections, error: connectionsError } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted");

      if (connectionsError) throw connectionsError;

      // Build list of connected user IDs
      const connectedUserIds = new Set<string>();
      connectedUserIds.add(user.id); // Include own posts

      connections?.forEach((conn) => {
        if (conn.requester_id === user.id) {
          connectedUserIds.add(conn.receiver_id);
        } else if (conn.receiver_id === user.id) {
          connectedUserIds.add(conn.requester_id);
        }
      });

      // Fetch posts from connected users
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("user_id", Array.from(connectedUserIds))
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Fetch profiles for all posts
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine posts with profile data
      const postsWithProfiles = postsData?.map(post => {
        const profile = profilesData?.find(p => p.id === post.user_id);
        return {
          ...post,
          author_name: profile?.full_name || "Usuário",
          author_avatar: profile?.avatar_url
        };
      }) || [];

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Erro ao carregar posts",
        description: "Não foi possível carregar o feed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelect = (file: File, type: 'image' | 'video') => {
    setMediaFile(file);
    const preview = URL.createObjectURL(file);
    setMediaPreview(preview);
  };

  const handleRemoveMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading media:", error);
      return null;
    }
  };

  const handleCreatePost = async () => {
    if ((!newPost.trim() && !mediaFile) || !user) return;

    setPosting(true);
    setUploadingMedia(true);

    try {
      let imageUrl = null;
      let videoUrl = null;

      // Upload media if present
      if (mediaFile) {
        const uploadedUrl = await uploadMedia(mediaFile);
        if (uploadedUrl) {
          if (mediaFile.type.startsWith('image/')) {
            imageUrl = uploadedUrl;
          } else if (mediaFile.type.startsWith('video/')) {
            videoUrl = uploadedUrl;
          }
        }
      }

      const { data: postData, error } = await supabase
        .from("posts")
        .insert({
          content: newPost,
          user_id: user.id,
          image_url: imageUrl,
          video_url: videoUrl,
          share_with_tree: shareWithTree,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert post_groups relationships
      if (selectedGroups.length > 0 && postData) {
        const postGroupInserts = selectedGroups.map(groupId => ({
          post_id: postData.id,
          group_id: groupId,
        }));

        const { error: groupsError } = await supabase
          .from("post_groups")
          .insert(postGroupInserts);

        if (groupsError) throw groupsError;
      }

      setNewPost("");
      handleRemoveMedia();
      setShareWithTree(false);
      setSelectedGroups([]);
      toast({
        title: "Post criado!",
        description: "Seu post foi publicado com sucesso",
      });
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Erro ao criar post",
        description: "Não foi possível publicar o post",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
      setUploadingMedia(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Timeline</h1>

        {/* Create Post */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Criar Post</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="No que você está pensando?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px]"
            />
            
            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative rounded-lg overflow-hidden border">
                {mediaFile?.type.startsWith('image/') ? (
                  <img src={mediaPreview} alt="Preview" className="w-full max-h-96 object-cover" />
                ) : (
                  <video src={mediaPreview} controls className="w-full max-h-96" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Sharing Options */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="share-tree"
                  checked={shareWithTree}
                  onCheckedChange={(checked) => setShareWithTree(checked as boolean)}
                />
                <Label htmlFor="share-tree" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Compartilhar com árvore
                </Label>
              </div>

              {userGroups.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Grupos ({selectedGroups.length})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Compartilhar com grupos</h4>
                      <div className="space-y-2">
                        {userGroups.map((group) => (
                          <div key={group.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`group-${group.id}`}
                              checked={selectedGroups.includes(group.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedGroups([...selectedGroups, group.id]);
                                } else {
                                  setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                                }
                              }}
                            />
                            <Label htmlFor={`group-${group.id}`} className="flex items-center gap-2 cursor-pointer">
                              {group.avatar_url ? (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={group.avatar_url} />
                                  <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                              ) : null}
                              <span>{group.name}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleMediaSelect(e.target.files[0], 'image')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!mediaFile}
                >
                  <Image className="h-4 w-4" />
                </Button>

                <Input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleMediaSelect(e.target.files[0], 'video')}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={!!mediaFile}
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={handleCreatePost}
                disabled={(!newPost.trim() && !mediaFile) || posting}
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {uploadingMedia ? "Enviando..." : "Publicar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum post ainda. Seja o primeiro a postar!
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.author_avatar || ""} />
                      <AvatarFallback>
                        {post.author_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{post.author_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {post.content && (
                    <p className="whitespace-pre-wrap mb-4">{post.content}</p>
                  )}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="rounded-lg w-full object-cover max-h-96"
                    />
                  )}
                  {post.video_url && (
                    <video
                      src={post.video_url}
                      controls
                      className="rounded-lg w-full max-h-96"
                    />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default Feed;
