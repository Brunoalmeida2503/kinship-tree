import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Globe, Map, MapPin, User, X, Calendar, Users, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ZoomLevel = 'world' | 'continent' | 'country' | 'state';

interface ZoomConfig {
  zoom: number;
  label: string;
  icon: React.ReactNode;
}

interface UserLocation {
  id: string;
  full_name: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
  location: string | null;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoidHJlZS1zb2NpYWwiLCJhIjoiY21nbTlid2J6MWU4NzJrcHFxbDc0NDhpZyJ9.BTX2-dUn_I-MyG-NBnL1Ew';

const MapVisualization = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('world');
  const [selectedLocation, setSelectedLocation] = useState<{ users: UserLocation[], location: string } | null>(null);
  const [connectionFilter, setConnectionFilter] = useState<'all' | 'family' | 'friend'>('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  const zoomLevels: Record<ZoomLevel, ZoomConfig> = {
    world: { zoom: 2, label: 'Mundo', icon: <Globe className="w-4 h-4" /> },
    continent: { zoom: 4, label: 'Continente', icon: <Map className="w-4 h-4" /> },
    country: { zoom: 6, label: 'País', icon: <MapPin className="w-4 h-4" /> },
    state: { zoom: 8, label: 'Estado', icon: <MapPin className="w-4 h-4" /> }
  };

  const loadConnections = async () => {
    if (!user || !map.current) return;

    try {
      // Buscar perfil do usuário e suas conexões
      let query = supabase
        .from('connections')
        .select(`
          id,
          requester_id,
          receiver_id,
          status,
          connection_type
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      // Aplicar filtro de tipo de conexão
      if (connectionFilter !== 'all') {
        query = query.eq('connection_type', connectionFilter);
      }
      
      const { data: connections, error } = await query;

      if (error) throw error;

      // Buscar todos os perfis com localização
      const userIds = new Set<string>();
      userIds.add(user.id);
      connections?.forEach(conn => {
        userIds.add(conn.requester_id);
        userIds.add(conn.receiver_id);
      });

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, latitude, longitude, location, avatar_url')
        .in('id', Array.from(userIds))
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        toast.info('Nenhum membro da família com localização cadastrada. Configure latitude e longitude no perfil para aparecer no mapa.');
        return;
      }

      // Agrupar usuários por localização
      const locationGroups = new globalThis.Map<string, UserLocation[]>();
      
      profiles?.forEach(profile => {
        const key = `${profile.latitude},${profile.longitude}`;
        if (!locationGroups.has(key)) {
          locationGroups.set(key, []);
        }
        locationGroups.get(key)!.push(profile as UserLocation);
      });

      // Limpar marcadores existentes
      const markers = document.getElementsByClassName('mapboxgl-marker');
      while (markers[0]) {
        markers[0].remove();
      }

      // Adicionar marcadores para cada localização
      locationGroups.forEach((usersAtLocation, locationKey) => {
        const [lat, lng] = locationKey.split(',').map(Number);
        const firstUser = usersAtLocation[0];
        
        const el = document.createElement('div');
        el.className = 'family-marker';
        el.style.position = 'relative';
        el.style.width = '60px';
        el.style.height = '60px';
        el.style.borderRadius = '50%';
        el.style.border = '4px solid hsl(var(--primary))';
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.3s ease';
        el.style.overflow = 'hidden';
        el.style.backgroundColor = 'hsl(var(--background))';
        
        // Se houver múltiplos usuários, criar um indicador
        if (usersAtLocation.length > 1) {
          // Badge com contador
          const badge = document.createElement('div');
          badge.style.position = 'absolute';
          badge.style.top = '-6px';
          badge.style.right = '-6px';
          badge.style.width = '24px';
          badge.style.height = '24px';
          badge.style.borderRadius = '50%';
          badge.style.backgroundColor = 'hsl(var(--destructive))';
          badge.style.color = 'white';
          badge.style.display = 'flex';
          badge.style.alignItems = 'center';
          badge.style.justifyContent = 'center';
          badge.style.fontSize = '12px';
          badge.style.fontWeight = 'bold';
          badge.style.border = '2px solid white';
          badge.style.zIndex = '10';
          badge.textContent = usersAtLocation.length.toString();
          el.appendChild(badge);
        }
        
        // Imagem de perfil do primeiro usuário
        if (firstUser.avatar_url) {
          el.style.backgroundImage = `url(${firstUser.avatar_url})`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        } else {
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.backgroundColor = 'hsl(var(--primary))';
          el.style.color = 'hsl(var(--primary-foreground))';
          el.style.fontSize = '20px';
          el.style.fontWeight = 'bold';
          const initials = firstUser.full_name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          el.textContent = initials;
        }
        
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
          el.style.zIndex = '1000';
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        });

        // Ao clicar, abrir diálogo com todos os usuários
        el.addEventListener('click', () => {
          setSelectedLocation({
            users: usersAtLocation,
            location: firstUser.location || 'Localização'
          });
        });

        new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);
      });

      // Removido: linhas de conexão não são mais necessárias

      // Ajustar visualização inicial
      if (profiles && profiles.length > 0 && currentZoom === 'world') {
        const bounds = new mapboxgl.LngLatBounds();
        profiles.forEach(profile => {
          bounds.extend([profile.longitude as number, profile.latitude as number]);
        });
        map.current.fitBounds(bounds, { padding: 80, maxZoom: 10 });
      }

    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
      toast.error('Erro ao carregar conexões no mapa. Verifique se há membros com localização cadastrada.');
    }
  };

  const handleZoomLevel = (level: ZoomLevel) => {
    if (!map.current) return;
    
    setCurrentZoom(level);
    const config = zoomLevels[level];
    
    map.current.flyTo({
      zoom: config.zoom,
      duration: 1500,
      essential: true
    });
  };

  const initializeMap = () => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      projection: 'globe' as any,
      zoom: 2,
      center: [0, 20],
      minZoom: 1,
      maxZoom: 12
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      map.current?.setFog({
        color: 'rgb(255, 255, 255)',
        'high-color': 'rgb(200, 200, 225)',
        'horizon-blend': 0.2,
      });
      
      loadConnections();
    });
  };

  useEffect(() => {
    initializeMap();

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current && user) {
      loadConnections();
    }
  }, [connectionFilter]);

  return (
    <>
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-semibold">Mapa de Conexões</h3>
            <div className="flex items-center gap-2">
              <Button onClick={loadConnections} variant="outline" size="sm">
                Atualizar
              </Button>
            </div>
          </div>
          
          <Tabs value={connectionFilter} onValueChange={(v) => setConnectionFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="gap-2">
                <Globe className="h-4 w-4" />
                Todas
              </TabsTrigger>
              <TabsTrigger value="family" className="gap-2">
                <Users className="h-4 w-4" />
                Família
              </TabsTrigger>
              <TabsTrigger value="friend" className="gap-2">
                <Heart className="h-4 w-4" />
                Amigos
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Nível de Zoom:</span>
            {(Object.keys(zoomLevels) as ZoomLevel[]).map((level) => (
              <Button
                key={level}
                onClick={() => handleZoomLevel(level)}
                variant={currentZoom === level ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                {zoomLevels[level].icon}
                {zoomLevels[level].label}
              </Button>
            ))}
          </div>
          
          <div 
            ref={mapContainer} 
            className="w-full h-[600px] rounded-lg shadow-lg overflow-hidden border border-border"
          />
          
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Clique nos marcadores para ver as fotos dos membros da família naquela localização.
              Use os botões de zoom para alternar entre visão mundial, continental, país e estado.
            </p>
          </div>
        </div>
      </Card>

      {/* Dialog de fotos dos usuários */}
      <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {selectedLocation?.location}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedLocation(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
            {selectedLocation?.users.map((userProfile) => (
              <div
                key={userProfile.id}
                className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border hover:border-primary transition-all cursor-pointer bg-card group"
                onClick={() => {
                  setSelectedLocation(null);
                  navigate('/', { state: { filterUserId: userProfile.id } });
                }}
              >
                <Avatar className="w-24 h-24 border-4 border-primary group-hover:scale-110 transition-transform">
                  <AvatarImage src={userProfile.avatar_url || undefined} alt={userProfile.full_name} />
                  <AvatarFallback className="bg-primary/20 text-lg">
                    <User className="w-10 h-10 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="font-semibold text-sm">{userProfile.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{userProfile.location || 'Localização'}</p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Calendar className="w-3 h-3" />
                    <span>Ver Timeline</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MapVisualization;
