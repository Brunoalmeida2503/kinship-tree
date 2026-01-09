import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Globe, 
  Tv, 
  ShoppingCart, 
  Truck, 
  Wallet,
  ExternalLink,
  Heart,
  Search,
  Plus,
  X,
  Maximize2,
  History,
  Clock,
  Bell,
  TrendingDown,
  TrendingUp,
  Loader2,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Service {
  id: string;
  name: string;
  icon: string;
  url: string;
  category: "streaming" | "shopping" | "delivery" | "finance";
  color: string;
  canEmbed: boolean;
}

interface WishlistItem {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  url?: string;
  target_price: number;
  monitor_days: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

interface PriceAlert {
  id: string;
  wishlist_item_id: string;
  marketplace: string;
  product_name: string;
  found_price: number;
  product_url: string | null;
  is_below_target: boolean;
  price_difference_percent: number;
  searched_at: string;
  seen: boolean;
}

const defaultServices: Service[] = [
  // Streaming
  { id: "netflix", name: "Netflix", icon: "🎬", url: "https://netflix.com", category: "streaming", color: "#E50914", canEmbed: false },
  { id: "primevideo", name: "Prime Video", icon: "📺", url: "https://primevideo.com", category: "streaming", color: "#00A8E1", canEmbed: false },
  { id: "disney", name: "Disney+", icon: "🏰", url: "https://disneyplus.com", category: "streaming", color: "#113CCF", canEmbed: false },
  { id: "spotify", name: "Spotify", icon: "🎵", url: "https://open.spotify.com", category: "streaming", color: "#1DB954", canEmbed: true },
  { id: "youtube", name: "YouTube", icon: "▶️", url: "https://youtube.com", category: "streaming", color: "#FF0000", canEmbed: true },
  { id: "hbomax", name: "Max", icon: "🎭", url: "https://max.com", category: "streaming", color: "#5822B4", canEmbed: false },
  
  // Shopping
  { id: "amazon", name: "Amazon", icon: "📦", url: "https://amazon.com.br", category: "shopping", color: "#FF9900", canEmbed: false },
  { id: "mercadolivre", name: "Mercado Livre", icon: "🛒", url: "https://mercadolivre.com.br", category: "shopping", color: "#FFE600", canEmbed: false },
  { id: "shopee", name: "Shopee", icon: "🛍️", url: "https://shopee.com.br", category: "shopping", color: "#EE4D2D", canEmbed: false },
  { id: "aliexpress", name: "AliExpress", icon: "🌐", url: "https://aliexpress.com", category: "shopping", color: "#E62E04", canEmbed: false },
  { id: "magalu", name: "Magazine Luiza", icon: "💙", url: "https://magazineluiza.com.br", category: "shopping", color: "#0086FF", canEmbed: false },
  { id: "americanas", name: "Americanas", icon: "❤️", url: "https://americanas.com.br", category: "shopping", color: "#E60014", canEmbed: false },
  
  // Delivery
  { id: "ifood", name: "iFood", icon: "🍔", url: "https://ifood.com.br", category: "delivery", color: "#EA1D2C", canEmbed: false },
  { id: "rappi", name: "Rappi", icon: "🛵", url: "https://rappi.com.br", category: "delivery", color: "#FF441F", canEmbed: false },
  { id: "ubereats", name: "Uber Eats", icon: "🥡", url: "https://ubereats.com", category: "delivery", color: "#06C167", canEmbed: false },
  { id: "zdelivery", name: "Zé Delivery", icon: "🍺", url: "https://ze.delivery", category: "delivery", color: "#FFD000", canEmbed: false },
  
  // Finance
  { id: "nubank", name: "Nubank", icon: "💜", url: "https://app.nubank.com.br", category: "finance", color: "#820AD1", canEmbed: false },
  { id: "inter", name: "Inter", icon: "🧡", url: "https://bancointer.com.br", category: "finance", color: "#FF7A00", canEmbed: false },
  { id: "c6bank", name: "C6 Bank", icon: "⚫", url: "https://c6bank.com.br", category: "finance", color: "#242424", canEmbed: false },
  { id: "picpay", name: "PicPay", icon: "💚", url: "https://picpay.com", category: "finance", color: "#21C25E", canEmbed: false },
];

const World = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [newWishlistItem, setNewWishlistItem] = useState({ name: "", brand: "", url: "", price: "", monitorDays: "" });
  const [showAddWishlist, setShowAddWishlist] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [embedName, setEmbedName] = useState("");
  const [streamingModalOpen, setStreamingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWishlist();
      fetchPriceAlerts();
    }
  }, [user]);

  const fetchWishlist = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("wishlist_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching wishlist:", error);
    } else {
      setWishlist(data || []);
    }
  };

  const fetchPriceAlerts = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("price_alerts")
      .select("*, wishlist_items!inner(user_id)")
      .eq("wishlist_items.user_id", user.id)
      .order("searched_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching price alerts:", error);
    } else {
      setPriceAlerts(data || []);
    }
  };

  const categoryIcons = {
    streaming: <Tv className="h-4 w-4" />,
    shopping: <ShoppingCart className="h-4 w-4" />,
    delivery: <Truck className="h-4 w-4" />,
    finance: <Wallet className="h-4 w-4" />,
  };

  const categoryLabels = {
    streaming: "Streaming",
    shopping: "Shopping",
    delivery: "Delivery",
    finance: "Finanças",
  };

  const filteredServices = defaultServices.filter((service) => {
    const matchesCategory = activeTab === "all" || service.category === activeTab;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenService = (service: Service) => {
    if (service.category === "streaming") {
      setSelectedService(service);
      setStreamingModalOpen(true);
    } else if (service.canEmbed) {
      setEmbedUrl(service.url);
      setEmbedName(service.name);
    } else {
      window.open(service.url, "_blank");
    }
  };

  const handleOpenExternal = (url: string | undefined) => {
    if (url) {
      window.open(url, "_blank");
    }
    setStreamingModalOpen(false);
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error("Faça login para adicionar itens");
      return;
    }
    if (!newWishlistItem.name || !newWishlistItem.price || !newWishlistItem.monitorDays) {
      toast.error("Preencha nome, preço e dias para monitorar");
      return;
    }

    const priceValue = parseFloat(newWishlistItem.price.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(priceValue)) {
      toast.error("Preço inválido");
      return;
    }

    const monitorDays = parseInt(newWishlistItem.monitorDays);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + monitorDays);

    setLoading(true);
    const { error } = await supabase.from("wishlist_items").insert({
      user_id: user.id,
      name: newWishlistItem.name,
      brand: newWishlistItem.brand || null,
      url: newWishlistItem.url || null,
      target_price: priceValue,
      monitor_days: monitorDays,
      expires_at: expiresAt.toISOString(),
    });

    setLoading(false);

    if (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Erro ao adicionar produto");
    } else {
      setNewWishlistItem({ name: "", brand: "", url: "", price: "", monitorDays: "" });
      setShowAddWishlist(false);
      fetchWishlist();
      toast.success("Produto adicionado! O robô irá monitorar os preços.");
    }
  };

  const handleRemoveFromWishlist = async (id: string) => {
    const { error } = await supabase.from("wishlist_items").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover produto");
    } else {
      fetchWishlist();
      toast.success("Produto removido da lista!");
    }
  };

  const handleSearchNow = async (itemId: string) => {
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-prices", {
        body: { wishlistItemId: itemId },
      });

      if (error) {
        throw error;
      }

      toast.success(data.message || "Busca realizada!");
      fetchPriceAlerts();
    } catch (error) {
      console.error("Error searching prices:", error);
      toast.error("Erro ao buscar preços");
    } finally {
      setSearching(false);
    }
  };

  const unseenAlerts = priceAlerts.filter((a) => !a.seen && a.is_below_target).length;

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">World</h1>
            </div>
          </div>

          <p className="text-muted-foreground mb-6">
            Acesse seus serviços favoritos, gerencie sua lista de desejos e explore o mundo conectado.
          </p>

          {/* Streaming Modal */}
          <Dialog open={streamingModalOpen} onOpenChange={setStreamingModalOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedService && (
                    <>
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: selectedService.color + "20" }}
                      >
                        {selectedService.icon}
                      </div>
                      <span>{selectedService.name}</span>
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <p className="text-muted-foreground">
                  Este serviço de streaming não pode ser exibido diretamente aqui devido a restrições de segurança.
                </p>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={() => selectedService && handleOpenExternal(selectedService.url)}
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Abrir {selectedService?.name} em nova aba
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline"
                    size="lg" 
                    className="w-full"
                    onClick={() => {
                      setStreamingModalOpen(false);
                      navigate("/world/streaming");
                    }}
                  >
                    <Clock className="h-5 w-5 mr-2" />
                    Meu Histórico de Streaming
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground">
                    Registre o que você assistiu e compartilhe com sua família
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Embed Dialog for embeddable services */}
          {embedUrl && (
            <Dialog open={!!embedUrl} onOpenChange={() => setEmbedUrl(null)}>
              <DialogContent className="max-w-6xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{embedName}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenExternal(embedUrl)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir em nova aba
                      </Button>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 h-full min-h-[60vh]">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full rounded-lg border"
                    title={embedName}
                    allow="autoplay; encrypted-media"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <TabsList className="grid grid-cols-5 w-full md:w-auto">
                <TabsTrigger value="all" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">Todos</span>
                </TabsTrigger>
                <TabsTrigger value="streaming" className="gap-2">
                  <Tv className="h-4 w-4" />
                  <span className="hidden sm:inline">Streaming</span>
                </TabsTrigger>
                <TabsTrigger value="shopping" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Shopping</span>
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-2">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Delivery</span>
                </TabsTrigger>
                <TabsTrigger value="finance" className="gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Finanças</span>
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviços..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <TabsContent value={activeTab} className="space-y-6">
              {/* Services Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredServices.map((service) => (
                  <Card
                    key={service.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 group"
                    onClick={() => handleOpenService(service)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-md"
                        style={{ backgroundColor: service.color + "20" }}
                      >
                        {service.icon}
                      </div>
                      <span className="font-medium text-sm">{service.name}</span>
                      <Badge variant="outline" className="text-xs gap-1">
                        {categoryIcons[service.category]}
                        {categoryLabels[service.category]}
                      </Badge>
                      {service.canEmbed && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Maximize2 className="h-3 w-3" />
                            Abrir aqui
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredServices.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum serviço encontrado
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Wishlist Section */}
          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Lista de Desejos
                </CardTitle>
                <CardDescription>
                  Salve produtos de qualquer loja para comprar depois
                </CardDescription>
              </div>
              <Dialog open={showAddWishlist} onOpenChange={setShowAddWishlist}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar à Lista de Desejos</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium">Nome do Produto *</label>
                      <Input
                        placeholder="Ex: iPhone 15 Pro"
                        value={newWishlistItem.name}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Marca (opcional)</label>
                      <Input
                        placeholder="Ex: Apple"
                        value={newWishlistItem.brand}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, brand: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Preço que Desejo Pagar *</label>
                      <Input
                        placeholder="R$ 0,00"
                        value={newWishlistItem.price}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Dias para Monitorar *</label>
                      <Input
                        type="number"
                        placeholder="Ex: 30"
                        min="1"
                        max="365"
                        value={newWishlistItem.monitorDays}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, monitorDays: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Link do Produto (opcional)</label>
                      <Input
                        placeholder="https://..."
                        value={newWishlistItem.url}
                        onChange={(e) => setNewWishlistItem({ ...newWishlistItem, url: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleAddToWishlist} className="w-full">
                      Adicionar à Lista
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {wishlist.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Sua lista de desejos está vazia</p>
                  <p className="text-sm">Adicione produtos que deseja monitorar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wishlist.map((item) => {
                    const daysRemaining = getDaysRemaining(item.expires_at);
                    const itemAlerts = priceAlerts.filter(
                      (a) => a.wishlist_item_id === item.id && a.is_below_target
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            {itemAlerts.length > 0 && (
                              <Badge variant="default" className="bg-green-500">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {itemAlerts.length} ofertas
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {item.brand && <span>{item.brand}</span>}
                            <span className="font-medium text-primary">
                              R$ {item.target_price.toFixed(2)}
                            </span>
                            <span>• {daysRemaining} dias restantes</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSearchNow(item.id)}
                            disabled={searching}
                            title="Buscar agora"
                          >
                            {searching ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          {item.url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenExternal(item.url)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromWishlist(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Price Alerts Section */}
          {priceAlerts.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-green-500" />
                  Alertas de Preço
                  {unseenAlerts > 0 && (
                    <Badge variant="destructive">{unseenAlerts} novos</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Preços encontrados nos últimos monitoramentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {priceAlerts.slice(0, 20).map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          alert.is_below_target ? "bg-green-500/10" : "bg-muted/50"
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm line-clamp-1">{alert.product_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{alert.marketplace}</span>
                            <span className={`font-medium ${alert.is_below_target ? "text-green-500" : "text-orange-500"}`}>
                              R$ {alert.found_price.toFixed(2)}
                            </span>
                            <span className="flex items-center gap-1">
                              {alert.is_below_target ? (
                                <>
                                  <TrendingDown className="h-3 w-3 text-green-500" />
                                  {Math.abs(alert.price_difference_percent).toFixed(0)}% abaixo
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="h-3 w-3 text-orange-500" />
                                  {alert.price_difference_percent.toFixed(0)}% acima
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        {alert.product_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenExternal(alert.product_url || undefined)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default World;
