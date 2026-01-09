import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Users, UserPlus, Trash2, Pencil, MoreVertical, Share2, Search } from "lucide-react";
import { postSchema } from "@/lib/validation";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { MediaUploader, uploadMediaFiles } from "@/components/feed/MediaUploader";
import { MediaGallery } from "@/components/feed/MediaGallery";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SharePostDialog } from "@/components/feed/SharePostDialog";
import { EditPostDialog } from "@/components/feed/EditPostDialog";
import { PostComments } from "@/components/feed/PostComments";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  is_group_post?: boolean;
  group_id?: string;
  media?: Array<{ url: string; type: 'image' | 'video' }>;
}

interface Group {
  id: string;
  name: string;
  avatar_url: string | null;
}

const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Array<{ file: File; preview: string; type: 'image' | 'video' }>>([]);
  const [shareWithTree, setShareWithTree] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [userConnections, setUserConnections] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [connectionSearchTerm, setConnectionSearchTerm] = useState('');
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [postToShare, setPostToShare] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Check if coming from map with user filter
    const state = location.state as { filterUserId?: string } | null;
    if (state?.filterUserId) {
      setFilterUserId(state.filterUserId);
    }
    
    fetchUserGroups();
    fetchUserConnections();
  }, [user, navigate, location]);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, filterUserId]);

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

  const fetchUserConnections = async () => {
    if (!user) return;
    
    try {
      const { data: connections, error: connectionsError } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted");

      if (connectionsError) throw connectionsError;

      const connectedUserIds = new Set<string>();
      connections?.forEach((conn) => {
        if (conn.requester_id === user.id) {
          connectedUserIds.add(conn.receiver_id);
        } else if (conn.receiver_id === user.id) {
          connectedUserIds.add(conn.requester_id);
        }
      });

      if (connectedUserIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", Array.from(connectedUserIds));

        if (profilesError) throw profilesError;
        setUserConnections(profilesData || []);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
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

      // Fetch posts from connected users (or filtered user)
      let postsQuery = supabase
        .from("posts")
        .select("*");
      
      if (filterUserId) {
        postsQuery = postsQuery.eq("user_id", filterUserId);
      } else {
        postsQuery = postsQuery.in("user_id", Array.from(connectedUserIds));
      }
      
      const { data: postsData, error: postsError } = await postsQuery
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Fetch media for all posts
      const postIds = postsData?.map(p => p.id) || [];
      let postMediaData: any[] = [];
      if (postIds.length > 0) {
        const { data: mediaData, error: mediaError } = await supabase
          .from("post_media")
          .select("*")
          .in("post_id", postIds)
          .order("display_order", { ascending: true });

        if (mediaError) {
          console.error("Error fetching post media:", mediaError);
        } else {
          postMediaData = mediaData || [];
        }
      }

      // Fetch group posts from groups where user is a member
      const { data: groupMemberships, error: groupMembersError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (groupMembersError) throw groupMembersError;

      const groupIds = groupMemberships?.map(gm => gm.group_id) || [];
      
      let groupPostsData: any[] = [];
      let groupsMap: Record<string, { id: string; name: string; avatar_url: string | null; created_by: string }> = {};
      if (groupIds.length > 0 && !filterUserId) {
        const { data, error: groupPostsError } = await supabase
          .from("group_posts")
          .select(`
            id,
            content,
            created_at,
            user_id,
            group_id,
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
          .in("group_id", groupIds)
          .order("created_at", { ascending: false });

        if (groupPostsError) {
          console.error("Error fetching group posts:", groupPostsError);
        } else {
          groupPostsData = data || [];
        }

        // Fetch group details to identify admin posts
        const { data: groupsDetails, error: groupsDetailsError } = await supabase
          .from("groups")
          .select("id, name, avatar_url, created_by")
          .in("id", groupIds);

        if (groupsDetailsError) {
          console.error("Error fetching group details:", groupsDetailsError);
        } else {
          groupsDetails?.forEach((g) => {
            groupsMap[g.id] = g;
          });
        }
      }

      // Fetch profiles for all posts
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine regular posts with profile data
      const regularPosts = postsData?.map(post => {
        const profile = profilesData?.find(p => p.id === post.user_id);
        const media = postMediaData.filter(m => m.post_id === post.id).map(m => ({
          url: m.media_url,
          type: m.media_type as 'image' | 'video'
        }));
        return {
          ...post,
          author_name: profile?.full_name || "Usuário",
          author_avatar: profile?.avatar_url,
          is_group_post: false,
          media
        };
      }) || [];

      // Transform group posts: only include admin-authored posts for member replication
      const transformedGroupPosts = groupPostsData
        .map((post) => {
          const groupInfo = groupsMap[post.group_id];
          const isAdmin = groupInfo && post.user_id === groupInfo.created_by;
          if (!isAdmin) return null;

          // Get first media if exists
          const firstMedia = post.group_post_media?.[0];

          return {
            id: `group-${post.id}`,
            content: post.content,
            image_url: firstMedia?.media_type === "image" ? firstMedia.media_url : null,
            video_url: firstMedia?.media_type === "video" ? firstMedia.media_url : null,
            created_at: post.created_at,
            user_id: post.user_id,
            share_with_tree: false,
            author_name: groupInfo?.name || "Grupo",
            author_avatar: groupInfo?.avatar_url,
            is_group_post: true,
            group_id: post.group_id,
          } as Post;
        })
        .filter(Boolean) as Post[];

      // Combine all posts and sort by date
      const allPosts = [...regularPosts, ...transformedGroupPosts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPosts(allPosts);
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

  const extractYouTubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const renderYouTubeEmbeds = (content: string) => {
    const urlRegex = /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/g;
    const youtubeUrls: string[] = [];
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
      youtubeUrls.push(match[0]);
    }

    if (youtubeUrls.length === 0) return null;

    return (
      <div className="space-y-2 mt-3">
        {youtubeUrls.map((url, index) => {
          const videoId = extractYouTubeId(url);
          if (!videoId) return null;
          
          return (
            <div key={index} className="aspect-video rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={`YouTube video ${index + 1}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        })}
      </div>
    );
  };

  const handleCreatePost = async () => {
    if (!user) return;

    // Validate input
    try {
      postSchema.parse({
        content: newPost,
        shareWithTree,
        selectedGroups
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!newPost.trim() && mediaFiles.length === 0) return;

    setPosting(true);

    try {
      const { data: postData, error } = await supabase
        .from("posts")
        .insert({
          content: newPost,
          user_id: user.id,
          share_with_tree: shareWithTree,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload media if present
      if (mediaFiles.length > 0) {
        const uploadedMedia = await uploadMediaFiles(mediaFiles, user.id, 'posts');
        
        const mediaData = uploadedMedia.map((media, index) => ({
          post_id: postData.id,
          media_url: media.url,
          media_type: media.type,
          display_order: index
        }));

        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(mediaData);

        if (mediaError) throw mediaError;
      }

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

      // Insert post_shares for selected connections
      if (selectedConnections.length > 0 && postData) {
        const postShareInserts = selectedConnections.map(userId => ({
          post_id: postData.id,
          shared_by: user.id,
          shared_with_user_id: userId,
        }));

        const { error: sharesError } = await supabase
          .from("post_shares")
          .insert(postShareInserts);

        if (sharesError) throw sharesError;
      }

      setNewPost("");
      setMediaFiles([]);
      setShareWithTree(false);
      setSelectedGroups([]);
      setSelectedConnections([]);
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
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postToDelete);

      if (error) throw error;

      toast({
        title: "Post excluído",
        description: "O post foi removido com sucesso",
      });
      
      setPosts(posts.filter(p => p.id !== postToDelete));
      setPostToDelete(null);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Erro ao excluir post",
        description: "Não foi possível remover o post",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
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
      <main className="container max-w-2xl mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">
            {filterUserId ? 'Timeline do Usuário' : 'Timeline'}
          </h1>
          {filterUserId && (
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterUserId(null);
                navigate('/', { replace: true });
                fetchPosts();
              }}
            >
              Ver Toda Timeline
            </Button>
          )}
        </div>

        {/* Create Post */}
        {!filterUserId && (
          <Card className="mb-6">
          <CardHeader>
            <h2 className="text-lg font-semibold">Criar Post</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="No que você está pensando? Cole links do YouTube para incorporá-los!"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px]"
            />
            
            <MediaUploader 
              onMediaChange={setMediaFiles}
              maxFiles={6}
              existingMedia={mediaFiles}
            />

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

              {userConnections.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Pessoas ({selectedConnections.length})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Compartilhar com pessoas</h4>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar familiares e amigos..."
                          value={connectionSearchTerm}
                          onChange={(e) => setConnectionSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {userConnections
                          .filter(conn => conn.full_name.toLowerCase().includes(connectionSearchTerm.toLowerCase()))
                          .map((connection) => (
                          <div key={connection.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`conn-${connection.id}`}
                              checked={selectedConnections.includes(connection.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedConnections([...selectedConnections, connection.id]);
                                } else {
                                  setSelectedConnections(selectedConnections.filter(id => id !== connection.id));
                                }
                              }}
                            />
                            <Label htmlFor={`conn-${connection.id}`} className="flex items-center gap-2 cursor-pointer">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={connection.avatar_url || undefined} />
                                <AvatarFallback>{connection.full_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{connection.full_name}</span>
                            </Label>
                          </div>
                        ))}
                        {userConnections.filter(conn => conn.full_name.toLowerCase().includes(connectionSearchTerm.toLowerCase())).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhum resultado encontrado
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

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
                      <div className="space-y-2 max-h-48 overflow-y-auto">
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
              <Button
                onClick={handleCreatePost}
                disabled={(!newPost.trim() && mediaFiles.length === 0) || posting}
              >
                {posting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Publicar
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

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
                  <div className="flex items-center justify-between">
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
                    
                    <div className="flex items-center gap-1">
                      {/* Share button - visible for all non-group posts */}
                      {!post.is_group_post && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPostToShare(post.id)}
                          title="Compartilhar"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Options menu - only for post owner */}
                      {!post.is_group_post && post.user_id === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setPostToEdit(post)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setPostToDelete(post.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {post.content && (
                    <p className="whitespace-pre-wrap mb-4">{post.content}</p>
                  )}
                  
                  {post.media && post.media.length > 0 && (
                    <div className="mb-4">
                      <MediaGallery media={post.media} />
                    </div>
                  )}

                  {post.image_url && !post.media?.length && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="rounded-lg w-full object-cover max-h-96 mb-4"
                    />
                  )}
                  {post.video_url && !post.media?.length && (
                    <video
                      src={post.video_url}
                      controls
                      className="rounded-lg w-full max-h-96 mb-4"
                    />
                  )}

                  {renderYouTubeEmbeds(post.content)}

                  {!post.is_group_post && (
                    <div className="mt-4 pt-4 border-t">
                      <PostComments postId={post.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Post Dialog */}
      <EditPostDialog
        post={postToEdit}
        open={!!postToEdit}
        onOpenChange={() => setPostToEdit(null)}
        onSuccess={fetchPosts}
      />

      {/* Share Post Dialog */}
      {postToShare && (
        <SharePostDialog
          postId={postToShare}
          open={!!postToShare}
          onOpenChange={(open) => !open && setPostToShare(null)}
        />
      )}
    </div>
  );
};

export default Feed;
