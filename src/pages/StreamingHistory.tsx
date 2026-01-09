import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tv, 
  Search,
  Plus,
  Star,
  Share2,
  Trash2,
  Film,
  Users,
  ArrowLeft,
  Calendar,
  Send,
  Eye,
  EyeOff,
  Clock,
  MessageSquare,
  Library
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StreamingCatalog, { CatalogItem } from "@/components/streaming/StreamingCatalog";

interface StreamingItem {
  id: string;
  user_id: string;
  title: string;
  media_type: string;
  tmdb_id?: string;
  poster_url?: string;
  backdrop_url?: string;
  year?: number;
  streaming_service?: string;
  watched_at: string;
  rating?: number;
  notes?: string;
  share_with_tree: boolean;
  is_recommendation: boolean;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  media_type: string;
}

interface Connection {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const streamingServices = [
  { id: "netflix", name: "Netflix", color: "#E50914" },
  { id: "prime", name: "Prime Video", color: "#00A8E1" },
  { id: "disney", name: "Disney+", color: "#113CCF" },
  { id: "hbo", name: "Max", color: "#5822B4" },
  { id: "spotify", name: "Spotify", color: "#1DB954" },
  { id: "youtube", name: "YouTube", color: "#FF0000" },
  { id: "other", name: "Outro", color: "#666666" },
];

const StreamingHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TMDBResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [myHistory, setMyHistory] = useState<StreamingItem[]>([]);
  const [treeHistory, setTreeHistory] = useState<StreamingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTMDB, setSelectedTMDB] = useState<TMDBResult | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [shareWithTree, setShareWithTree] = useState(false);
  const [mediaType, setMediaType] = useState("movie");
  const [saving, setSaving] = useState(false);

  // Recommend dialog state
  const [showRecommendDialog, setShowRecommendDialog] = useState(false);
  const [selectedItemToRecommend, setSelectedItemToRecommend] = useState<StreamingItem | null>(null);
  const [selectedConnectionsToRecommend, setSelectedConnectionsToRecommend] = useState<string[]>([]);
  const [recommendMessage, setRecommendMessage] = useState("");

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchConnections();
    }
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch my history
      const { data: myData, error: myError } = await supabase
        .from("streaming_history")
        .select("*")
        .eq("user_id", user.id)
        .order("watched_at", { ascending: false });
      
      if (myError) throw myError;
      setMyHistory(myData || []);

      // Fetch tree history (shared by connections)
      const { data: treeData, error: treeError } = await supabase
        .from("streaming_history")
        .select("*")
        .eq("share_with_tree", true)
        .neq("user_id", user.id)
        .order("watched_at", { ascending: false });
      
      if (treeError) throw treeError;

      // Fetch author info for tree items
      if (treeData && treeData.length > 0) {
        const userIds = [...new Set(treeData.map(item => item.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const enrichedData = treeData.map(item => ({
          ...item,
          author: profileMap.get(item.user_id)
        }));
        setTreeHistory(enrichedData);
      } else {
        setTreeHistory([]);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    if (!user) return;
    
    try {
      const { data: connectionData } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      if (connectionData && connectionData.length > 0) {
        const otherUserIds = connectionData.map(c => 
          c.requester_id === user.id ? c.receiver_id : c.requester_id
        );
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", otherUserIds);
        
        setConnections(profiles || []);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const searchTMDB = async (query: string) => {
    if (!query || query.length < 2) {
      setTmdbResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // Using TMDB API through a simple search
      // Note: In production, you'd want to use an edge function with the API key
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=2174d146bb9c0eab47529b2e77d6b526&query=${encodeURIComponent(query)}&language=pt-BR`
      );
      const data = await response.json();
      
      const filtered = (data.results || [])
        .filter((item: TMDBResult) => item.media_type === "movie" || item.media_type === "tv")
        .slice(0, 10);
      
      setTmdbResults(filtered);
    } catch (error) {
      console.error("TMDB search error:", error);
      setTmdbResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectTMDB = (item: TMDBResult) => {
    setSelectedTMDB(item);
    setManualTitle(item.title || item.name || "");
    setManualYear((item.release_date || item.first_air_date || "").split("-")[0]);
    setMediaType(item.media_type === "tv" ? "series" : "movie");
    setTmdbResults([]);
    setSearchQuery("");
  };

  const handleAddToHistory = async () => {
    if (!user) return;
    
    const title = selectedTMDB ? (selectedTMDB.title || selectedTMDB.name) : manualTitle;
    if (!title) {
      toast.error("Informe o título");
      return;
    }
    
    setSaving(true);
    try {
      const newItem = {
        user_id: user.id,
        title,
        media_type: mediaType,
        tmdb_id: selectedTMDB?.id.toString(),
        poster_url: selectedTMDB?.poster_path 
          ? `https://image.tmdb.org/t/p/w500${selectedTMDB.poster_path}` 
          : null,
        backdrop_url: selectedTMDB?.backdrop_path 
          ? `https://image.tmdb.org/t/p/w1280${selectedTMDB.backdrop_path}` 
          : null,
        year: manualYear ? parseInt(manualYear) : null,
        streaming_service: selectedService || null,
        rating: rating > 0 ? rating : null,
        notes: notes || null,
        share_with_tree: shareWithTree,
        is_recommendation: false,
        watched_at: new Date().toISOString(),
      };
      
      const { error } = await supabase.from("streaming_history").insert(newItem);
      
      if (error) throw error;
      
      toast.success("Adicionado ao histórico!");
      resetAddForm();
      setShowAddDialog(false);
      fetchHistory();
    } catch (error) {
      console.error("Error adding to history:", error);
      toast.error("Erro ao adicionar");
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setSelectedTMDB(null);
    setManualTitle("");
    setManualYear("");
    setSelectedService("");
    setRating(0);
    setNotes("");
    setShareWithTree(false);
    setMediaType("movie");
    setSearchQuery("");
    setTmdbResults([]);
  };

  const handleAddFromCatalog = async (item: CatalogItem, serviceId: string) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const newItem = {
        user_id: user.id,
        title: item.title,
        media_type: item.media_type,
        tmdb_id: item.tmdb_id || null,
        poster_url: item.poster_url,
        backdrop_url: null,
        year: item.year,
        streaming_service: serviceId,
        rating: null,
        notes: null,
        share_with_tree: false,
        is_recommendation: false,
        watched_at: new Date().toISOString(),
      };
      
      const { error } = await supabase.from("streaming_history").insert(newItem);
      
      if (error) throw error;
      
      toast.success(`"${item.title}" adicionado ao histórico!`);
      fetchHistory();
      setActiveTab("my-history");
    } catch (error) {
      console.error("Error adding from catalog:", error);
      toast.error("Erro ao adicionar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("streaming_history").delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Removido do histórico");
      fetchHistory();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Erro ao remover");
    }
  };

  const handleToggleShare = async (item: StreamingItem) => {
    try {
      const { error } = await supabase
        .from("streaming_history")
        .update({ share_with_tree: !item.share_with_tree })
        .eq("id", item.id);
      
      if (error) throw error;
      
      toast.success(item.share_with_tree ? "Compartilhamento removido" : "Compartilhando com a árvore");
      fetchHistory();
    } catch (error) {
      console.error("Error toggling share:", error);
      toast.error("Erro ao atualizar");
    }
  };

  const handleRecommend = (item: StreamingItem) => {
    setSelectedItemToRecommend(item);
    setSelectedConnectionsToRecommend([]);
    setRecommendMessage("");
    setShowRecommendDialog(true);
  };

  const handleSendRecommendations = async () => {
    if (!selectedItemToRecommend || selectedConnectionsToRecommend.length === 0) return;
    
    try {
      const recommendations = selectedConnectionsToRecommend.map(toUserId => ({
        from_user_id: user?.id,
        to_user_id: toUserId,
        history_item_id: selectedItemToRecommend.id,
        message: recommendMessage || null,
      }));
      
      const { error } = await supabase.from("streaming_recommendations").insert(recommendations);
      
      if (error) throw error;
      
      toast.success("Recomendações enviadas!");
      setShowRecommendDialog(false);
    } catch (error) {
      console.error("Error sending recommendations:", error);
      toast.error("Erro ao enviar recomendações");
    }
  };

  const getServiceColor = (serviceId?: string) => {
    const service = streamingServices.find(s => s.id === serviceId);
    return service?.color || "#666666";
  };

  const getServiceName = (serviceId?: string) => {
    const service = streamingServices.find(s => s.id === serviceId);
    return service?.name || serviceId;
  };

  const renderHistoryCard = (item: StreamingItem, isTreeView: boolean = false) => (
    <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex">
        {item.poster_url ? (
          <img 
            src={item.poster_url} 
            alt={item.title}
            className="w-24 h-36 object-cover"
          />
        ) : (
          <div className="w-24 h-36 bg-muted flex items-center justify-center">
            <Film className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold line-clamp-1">{item.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                {item.year && <span>{item.year}</span>}
                <Badge variant="outline" className="text-xs">
                  {item.media_type === "series" ? "Série" : "Filme"}
                </Badge>
              </div>
            </div>
            {item.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{item.rating}</span>
              </div>
            )}
          </div>
          
          {item.streaming_service && (
            <Badge 
              className="mt-2 text-white text-xs"
              style={{ backgroundColor: getServiceColor(item.streaming_service) }}
            >
              {getServiceName(item.streaming_service)}
            </Badge>
          )}
          
          {item.notes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.notes}</p>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(item.watched_at).toLocaleDateString("pt-BR")}
            </div>
            
            {isTreeView && item.author && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={item.author.avatar_url || undefined} />
                  <AvatarFallback>{item.author.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{item.author.full_name}</span>
              </div>
            )}
            
            {!isTreeView && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleShare(item)}
                  title={item.share_with_tree ? "Parar de compartilhar" : "Compartilhar com árvore"}
                >
                  {item.share_with_tree ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRecommend(item)}
                  title="Recomendar"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <Button variant="ghost" size="icon" onClick={() => navigate("/world")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Tv className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Histórico de Streaming</h1>
            </div>
          </div>

          <p className="text-muted-foreground mb-6">
            Registre o que você assistiu, avalie e compartilhe com sua família.
          </p>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TabsList>
                <TabsTrigger value="catalog" className="gap-2">
                  <Library className="h-4 w-4" />
                  Catálogo
                </TabsTrigger>
                <TabsTrigger value="my-history" className="gap-2">
                  <Film className="h-4 w-4" />
                  Meu Histórico
                </TabsTrigger>
                <TabsTrigger value="tree-history" className="gap-2">
                  <Users className="h-4 w-4" />
                  Da Árvore
                </TabsTrigger>
              </TabsList>

              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Adicionar ao Histórico</DialogTitle>
                    <DialogDescription>
                      Busque um filme/série ou adicione manualmente
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    {/* Search TMDB */}
                    <div className="space-y-2">
                      <Label>Buscar Filme/Série</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Digite o nome..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            searchTMDB(e.target.value);
                          }}
                          className="pl-10"
                        />
                      </div>
                      
                      {/* Search results */}
                      {tmdbResults.length > 0 && (
                        <ScrollArea className="h-48 border rounded-lg">
                          <div className="p-2 space-y-2">
                            {tmdbResults.map((result) => (
                              <div
                                key={result.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                                onClick={() => handleSelectTMDB(result)}
                              >
                                {result.poster_path ? (
                                  <img 
                                    src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                    alt={result.title || result.name}
                                    className="w-10 h-14 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                                    <Film className="h-4 w-4" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-sm">{result.title || result.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {result.media_type === "tv" ? "Série" : "Filme"} • {(result.release_date || result.first_air_date || "").split("-")[0]}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                      
                      {searching && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Buscando...
                        </p>
                      )}
                    </div>

                    {/* Selected or manual entry */}
                    {selectedTMDB && (
                      <Card className="p-3">
                        <div className="flex items-center gap-3">
                          {selectedTMDB.poster_path && (
                            <img 
                              src={`https://image.tmdb.org/t/p/w92${selectedTMDB.poster_path}`}
                              alt={selectedTMDB.title || selectedTMDB.name}
                              className="w-12 h-18 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{selectedTMDB.title || selectedTMDB.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedTMDB.media_type === "tv" ? "Série" : "Filme"}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-auto"
                            onClick={() => setSelectedTMDB(null)}
                          >
                            Limpar
                          </Button>
                        </div>
                      </Card>
                    )}

                    {!selectedTMDB && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Título Manual</Label>
                            <Input
                              placeholder="Nome do filme/série"
                              value={manualTitle}
                              onChange={(e) => setManualTitle(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ano</Label>
                            <Input
                              placeholder="2024"
                              value={manualYear}
                              onChange={(e) => setManualYear(e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select value={mediaType} onValueChange={setMediaType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="movie">Filme</SelectItem>
                              <SelectItem value="series">Série</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Onde assistiu?</Label>
                      <Select value={selectedService} onValueChange={setSelectedService}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {streamingServices.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: service.color }}
                                />
                                {service.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Avaliação</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(rating === star ? 0 : star)}
                            className="p-1"
                          >
                            <Star 
                              className={`h-6 w-6 ${
                                star <= rating 
                                  ? "fill-yellow-400 text-yellow-400" 
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        placeholder="O que achou? Vale a pena?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="share-tree"
                        checked={shareWithTree}
                        onCheckedChange={(checked) => setShareWithTree(checked as boolean)}
                      />
                      <Label htmlFor="share-tree" className="flex items-center gap-2 cursor-pointer">
                        <Users className="h-4 w-4" />
                        Compartilhar com minha árvore
                      </Label>
                    </div>

                    <Button onClick={handleAddToHistory} disabled={saving} className="w-full">
                      {saving ? "Salvando..." : "Adicionar ao Histórico"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <TabsContent value="catalog">
              <StreamingCatalog onAddToHistory={handleAddFromCatalog} />
            </TabsContent>

            <TabsContent value="my-history">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando...
                </div>
              ) : myHistory.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    <Film className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Seu histórico está vazio</p>
                    <p className="text-sm mt-2">Adicione filmes e séries que você assistiu</p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {myHistory.map((item) => renderHistoryCard(item))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tree-history">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando...
                </div>
              ) : treeHistory.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Nenhum item compartilhado</p>
                    <p className="text-sm mt-2">Quando suas conexões compartilharem o histórico, aparecerá aqui</p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {treeHistory.map((item) => renderHistoryCard(item, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Recommend Dialog */}
          <Dialog open={showRecommendDialog} onOpenChange={setShowRecommendDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Recomendar</DialogTitle>
                <DialogDescription>
                  {selectedItemToRecommend?.title}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Selecione as pessoas</Label>
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    {connections.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma conexão encontrada
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {connections.map((connection) => (
                          <div
                            key={connection.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                            onClick={() => {
                              setSelectedConnectionsToRecommend(prev => 
                                prev.includes(connection.id)
                                  ? prev.filter(id => id !== connection.id)
                                  : [...prev, connection.id]
                              );
                            }}
                          >
                            <Checkbox 
                              checked={selectedConnectionsToRecommend.includes(connection.id)}
                              onCheckedChange={() => {}}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={connection.avatar_url || undefined} />
                              <AvatarFallback>{connection.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{connection.full_name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem (opcional)</Label>
                  <Textarea
                    placeholder="Você precisa assistir isso!"
                    value={recommendMessage}
                    onChange={(e) => setRecommendMessage(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleSendRecommendations} 
                  disabled={selectedConnectionsToRecommend.length === 0}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Recomendação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default StreamingHistory;
