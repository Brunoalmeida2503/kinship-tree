import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const MapVisualization = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenSet, setTokenSet] = useState(false);
  const { user } = useAuth();

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

      // Adicionar marcadores no mapa
      profiles?.forEach(profile => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundSize = '100%';
        el.style.cursor = 'pointer';

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="padding: 8px;">
            <h3 style="margin: 0 0 4px 0; font-weight: bold;">${profile.full_name}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">${profile.location || 'Localização não especificada'}</p>
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
            'line-width': 2,
            'line-opacity': 0.6
          }
        });
      }

      // Ajustar zoom para mostrar todos os pontos
      if (profiles && profiles.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        profiles.forEach(profile => {
          bounds.extend([profile.longitude as number, profile.latitude as number]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }

    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
      toast.error('Erro ao carregar conexões no mapa');
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || !tokenSet || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      projection: 'globe' as any,
      zoom: 2,
      center: [0, 20],
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
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Mapa de Conexões Globais</h3>
          <Button onClick={loadConnections} variant="outline" size="sm">
            Atualizar
          </Button>
        </div>
        <div 
          ref={mapContainer} 
          className="w-full h-[600px] rounded-lg shadow-lg"
        />
        <p className="text-sm text-muted-foreground">
          Use o mouse para navegar: arrastar para mover, scroll para zoom. 
          Clique nos marcadores para ver detalhes das conexões.
        </p>
      </div>
    </Card>
  );
};

export default MapVisualization;
