import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Share2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SharePostDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Connection {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface Share {
  id: string;
  shared_with_user_id: string;
  shared_with_user: {
    full_name: string;
    avatar_url?: string;
  };
}

export function SharePostDialog({ postId, open, onOpenChange }: SharePostDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentShares, setCurrentShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, postId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from("connections")
        .select(`
          requester_id,
          receiver_id,
          requester:profiles!connections_requester_id_fkey(id, full_name, avatar_url),
          receiver:profiles!connections_receiver_id_fkey(id, full_name, avatar_url)
        `)
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (connectionsError) throw connectionsError;

      const connectionsList: Connection[] = (connectionsData || []).map((conn: any) => {
        const isRequester = conn.requester_id === user.id;
        const profile = isRequester ? conn.receiver : conn.requester;
        return {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        };
      });

      setConnections(connectionsList);

      // Load current shares
      const { data: sharesData, error: sharesError } = await supabase
        .from("post_shares")
        .select("id, shared_with_user_id")
        .eq("post_id", postId);

      if (sharesError) throw sharesError;

      // Load profiles for shared users
      if (sharesData && sharesData.length > 0) {
        const userIds = sharesData.map(s => s.shared_with_user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const sharesWithProfiles = sharesData.map(share => {
          const profile = profilesData?.find(p => p.id === share.shared_with_user_id);
          return {
            id: share.id,
            shared_with_user_id: share.shared_with_user_id,
            shared_with_user: {
              full_name: profile?.full_name || 'Usuário',
              avatar_url: profile?.avatar_url,
            }
          };
        });

        setCurrentShares(sharesWithProfiles);
      } else {
        setCurrentShares([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShareWithUsers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sharesToInsert = selectedUsers.map(userId => ({
        post_id: postId,
        shared_by: user.id,
        shared_with_user_id: userId,
      }));

      const { error } = await supabase
        .from("post_shares")
        .insert(sharesToInsert);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Post compartilhado com as conexões selecionadas",
      });

      setSelectedUsers([]);
      await loadData();
    } catch (error: any) {
      console.error("Error sharing post:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível compartilhar o post",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from("post_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Compartilhamento removido",
      });

      await loadData();
    } catch (error) {
      console.error("Error removing share:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o compartilhamento",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Post</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share with specific connections */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Compartilhar com conexões</h3>
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Você não tem conexões ainda
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {connections.map((connection) => {
                    const isShared = currentShares.some(
                      share => share.shared_with_user_id === connection.id
                    );
                    
                    return (
                      <div
                        key={connection.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent"
                      >
                        <Checkbox
                          checked={selectedUsers.includes(connection.id)}
                          onCheckedChange={() => toggleUserSelection(connection.id)}
                          disabled={isShared}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={connection.avatar_url} />
                          <AvatarFallback>
                            {connection.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1">{connection.full_name}</span>
                        {isShared && (
                          <Badge variant="secondary" className="text-xs">
                            Compartilhado
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={handleShareWithUsers}
                  disabled={selectedUsers.length === 0 || saving}
                  className="w-full"
                >
                  Compartilhar com {selectedUsers.length} {selectedUsers.length === 1 ? 'pessoa' : 'pessoas'}
                </Button>
              </>
            )}
          </div>

          {/* Current shares */}
          {currentShares.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Compartilhado com</h3>
              <div className="space-y-2">
                {currentShares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 bg-accent rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={share.shared_with_user.avatar_url} />
                        <AvatarFallback>
                          {share.shared_with_user.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {share.shared_with_user.full_name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveShare(share.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
