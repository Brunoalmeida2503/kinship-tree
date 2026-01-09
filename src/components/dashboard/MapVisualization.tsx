import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Globe, Map, MapPin, Users, Heart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type ZoomLevel = 'world' | 'continent' | 'country' | 'state';

interface ZoomConfig {
  zoom: number;
  label: string;
  icon: React.ReactNode;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoidHJlZS1zb2NpYWwiLCJhIjoiY21nbTlid2J6MWU4NzJrcHFxbDc0NDhpZyJ9.BTX2-dUn_I-MyG-NBnL1Ew';

const MapVisualization = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('world');
  const [connectionFilter, setConnectionFilter] = useState<'all' | 'family' | 'friend'>('all');
  const [showLines, setShowLines] = useState(true);
  const { user } = useAuth();

  const zoomLevels: Record<ZoomLevel, ZoomConfig> = {
    world: { zoom: 2, label: 'Mundo', icon: <Globe className="w-4 h-4" /> },
    continent: { zoom: 4, label: 'Continente', icon: <Map className="w-4 h-4" /> },
    country: { zoom: 6, label: 'País', icon: <MapPin className="w-4 h-4" /> },
    state: { zoom: 8, label: 'Estado', icon: <MapPin className="w-4 h-4" /> }
  };

  const loadConnections = async () => {
    if (!user || !map.current) return;

    try {
      // Buscar perfil do usuário logado
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('id, full_name, latitude, longitude, location, avatar_url')
        .eq('id', user.id)
        .single();

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

      // Limpar marcadores e layers existentes
      const markers = document.getElementsByClassName('mapboxgl-marker');
      while (markers[0]) {
        markers[0].remove();
      }

      // Remover layers e sources antigos se existirem
      if (map.current?.getLayer('connection-lines')) {
        map.current.removeLayer('connection-lines');
      }
      if (map.current?.getSource('connection-lines')) {
        map.current.removeSource('connection-lines');
      }

      // Adicionar linhas conectando o usuário às suas conexões PRIMEIRO (para ficarem atrás dos marcadores)
      if (currentUserProfile?.latitude && currentUserProfile?.longitude && connections && connections.length > 0) {
        const lineFeatures: any[] = [];

        connections.forEach((conn) => {
          const otherUserId = conn.requester_id === user.id ? conn.receiver_id : conn.requester_id;
          const otherUserProfile = profiles?.find(p => p.id === otherUserId);

          if (otherUserProfile?.latitude && otherUserProfile?.longitude) {
            const lineColor = conn.connection_type === 'family' ? '#8B5CF6' : '#f59e0b';

            lineFeatures.push({
              type: 'Feature',
              properties: {
                color: lineColor,
                connectionType: conn.connection_type
              },
              geometry: {
                type: 'LineString',
                coordinates: [
                  [currentUserProfile.longitude, currentUserProfile.latitude],
                  [otherUserProfile.longitude, otherUserProfile.latitude]
                ]
              }
            });
          }
        });

        if (lineFeatures.length > 0 && showLines) {
          map.current!.addSource('connection-lines', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: lineFeatures
            }
          });

          // Camada principal das linhas
          map.current!.addLayer({
            id: 'connection-lines',
            type: 'line',
            source: 'connection-lines',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 3,
              'line-opacity': 0.8
            }
          });
        }
      }

      // Adicionar marcador do usuário atual se tiver localização (marcador 0)
      if (currentUserProfile?.latitude && currentUserProfile?.longitude) {
        const userEl = document.createElement("div");
        userEl.className = "tree-marker";
        userEl.style.backgroundColor = "#10b981";
        userEl.style.width = "42px";
        userEl.style.height = "42px";
        userEl.style.borderRadius = "50%";
        userEl.style.border = "4px solid white";
        userEl.style.cursor = "pointer";
        userEl.style.display = "flex";
        userEl.style.alignItems = "center";
        userEl.style.justifyContent = "center";
        userEl.style.color = "white";
        userEl.style.fontWeight = "bold";
        userEl.style.fontSize = "16px";
        userEl.style.boxShadow = "0 3px 10px rgba(0,0,0,0.4)";
        userEl.style.zIndex = "100";
        userEl.textContent = "0";

        new mapboxgl.Marker(userEl)
          .setLngLat([currentUserProfile.longitude, currentUserProfile.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div class="p-2">
                <p class="font-semibold">${currentUserProfile.full_name}</p>
                <p class="text-xs text-muted-foreground">Você</p>
              </div>`
            )
          )
          .addTo(map.current!);
      }

      // Adicionar marcadores numerados para cada usuário conectado
      let markerIndex = 1;
      profiles?.forEach(profile => {
        // Pular o usuário atual
        if (profile.id === user.id) return;

        if (profile.latitude && profile.longitude) {
          // Determinar cor baseada no tipo de conexão
          const connection = connections?.find(
            c => c.requester_id === profile.id || c.receiver_id === profile.id
          );
          const markerColor = connection?.connection_type === 'family' ? '#8B5CF6' : '#f59e0b';

          const el = document.createElement("div");
          el.className = "tree-marker";
          el.style.backgroundColor = markerColor;
          el.style.width = "36px";
          el.style.height = "36px";
          el.style.borderRadius = "50%";
          el.style.border = "3px solid white";
          el.style.cursor = "pointer";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.color = "white";
          el.style.fontWeight = "bold";
          el.style.fontSize = "14px";
          el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
          el.textContent = markerIndex.toString();

          new mapboxgl.Marker(el)
            .setLngLat([profile.longitude, profile.latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div class="p-2">
                  <p class="font-semibold">${profile.full_name}</p>
                  <p class="text-xs text-muted-foreground">${profile.location || 'Sem localização'}</p>
                  <p class="text-xs text-muted-foreground mt-1">${connection?.connection_type === 'family' ? 'Família' : 'Amigo'}</p>
                </div>`
              )
            )
            .addTo(map.current!);

          markerIndex++;
        }
      });

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
  }, [connectionFilter, showLines]);

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
          
          <div className="flex items-center justify-between flex-wrap gap-4">
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
            
            <div className="flex items-center gap-2">
              <Switch
                id="show-lines"
                checked={showLines}
                onCheckedChange={setShowLines}
              />
              <Label htmlFor="show-lines" className="text-sm cursor-pointer">
                Exibir linhas
              </Label>
            </div>
          </div>
          
          <div 
            ref={mapContainer} 
            className="w-full h-[600px] rounded-lg shadow-lg overflow-hidden border border-border"
          />
          
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Os marcadores numerados mostram suas conexões. 0 = você, números seguintes = suas conexões.
              Use os botões de zoom para alternar entre diferentes níveis de visualização.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
};

export default MapVisualization;
