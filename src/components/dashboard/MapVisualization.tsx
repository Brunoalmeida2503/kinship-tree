import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Globe, Map, MapPin } from 'lucide-react';

type ZoomLevel = 'world' | 'continent' | 'country' | 'state';

interface ZoomConfig {
  zoom: number;
  label: string;
  icon: React.ReactNode;
}

const MapVisualization = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenSet, setTokenSet] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<ZoomLevel>('world');
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
      // Buscar perfil do usuário e suas conexões
      const { data: connections, error } = await supabase
        .from('connections')
        .select(`
          id,
          requester_id,
          receiver_id,
          status
        `)
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

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
        .select('id, full_name, latitude, longitude, location')
        .in('id', Array.from(userIds))
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (profilesError) throw profilesError;

      // Limpar marcadores existentes
      const markers = document.getElementsByClassName('mapboxgl-marker');
      while (markers[0]) {
        markers[0].remove();
      }

      // Adicionar marcadores no mapa com estilo personalizado
      profiles?.forEach(profile => {
        const el = document.createElement('div');
        el.className = 'family-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = 'hsl(var(--primary))';
        el.style.border = '3px solid hsl(var(--background))';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.3s ease';
        
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
          el.style.zIndex = '1000';
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        });

        const popup = new mapboxgl.Popup({ offset: 25, className: 'family-popup' }).setHTML(
          `<div style="padding: 12px; min-width: 180px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px; color: hsl(var(--foreground));">${profile.full_name}</h3>
            <p style="margin: 0; font-size: 13px; color: hsl(var(--muted-foreground));">${profile.location || 'Localização não especificada'}</p>
          </div>`
        );

        new mapboxgl.Marker(el)
          .setLngLat([profile.longitude as number, profile.latitude as number])
          .setPopup(popup)
          .addTo(map.current!);
      });

      // Desenhar linhas entre conexões
      const lineFeatures = connections?.map(conn => {
        const requester = profiles?.find(p => p.id === conn.requester_id);
        const receiver = profiles?.find(p => p.id === conn.receiver_id);
        
        if (requester && receiver) {
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [requester.longitude as number, requester.latitude as number],
                [receiver.longitude as number, receiver.latitude as number]
              ]
            },
            properties: {}
          };
        }
        return null;
      }).filter(Boolean);

      if (map.current.getSource('connections')) {
        (map.current.getSource('connections') as mapboxgl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: lineFeatures as any[]
        });
      } else {
        map.current.addSource('connections', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: lineFeatures as any[]
          }
        });

        map.current.addLayer({
          id: 'connections-layer',
          type: 'line',
          source: 'connections',
          paint: {
            'line-color': 'hsl(var(--primary))',
            'line-width': 3,
            'line-opacity': 0.5,
            'line-blur': 1
          }
        });
      }

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
      toast.error('Erro ao carregar conexões no mapa');
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
    if (!mapContainer.current || !tokenSet || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
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
    if (tokenSet && mapboxToken) {
      initializeMap();
    }

    return () => {
      map.current?.remove();
    };
  }, [tokenSet, mapboxToken]);

  if (!tokenSet) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Configurar Mapbox</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Para visualizar o mapa de conexões, você precisa fornecer um token público do Mapbox.
              Você pode obter um em{' '}
              <a 
                href="https://mapbox.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Cole seu Mapbox Public Token aqui"
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
            />
            <Button 
              onClick={() => setTokenSet(true)}
              disabled={!mapboxToken}
              className="w-full"
            >
              Ativar Mapa
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-lg font-semibold">Mapa de Conexões da Família</h3>
          <div className="flex items-center gap-2">
            <Button onClick={loadConnections} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </div>
        
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
            Use os botões de zoom para alternar entre visão mundial, continental, país e estado. 
            As linhas conectam membros da família. Clique nos marcadores para ver detalhes.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default MapVisualization;
