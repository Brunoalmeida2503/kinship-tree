import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
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

const MAPBOX_TOKEN = 'pk.eyJ1IjoidHJlZS1zb2NpYWwiLCJhIjoiY21nbTlid2J6MWU4NzJrcHFxbDc0NDhpZyJ9.BTX2-dUn_I-MyG-NBnL1Ew';

const MapVisualization = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
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
        .select('id, full_name, latitude, longitude, location, avatar_url')
        .in('id', Array.from(userIds))
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (profilesError) throw profilesError;

      // Verificar se há perfis com localização
      if (!profiles || profiles.length === 0) {
        toast.info('Nenhum membro da família com localização cadastrada. Configure latitude e longitude no perfil para aparecer no mapa.');
        return;
      }

      // Limpar marcadores existentes
      const markers = document.getElementsByClassName('mapboxgl-marker');
      while (markers[0]) {
        markers[0].remove();
      }

      // Adicionar marcadores com foto do perfil
      profiles?.forEach(profile => {
        const el = document.createElement('div');
        el.className = 'family-marker';
        el.style.width = '56px';
        el.style.height = '56px';
        el.style.borderRadius = '50%';
        el.style.border = '3px solid hsl(var(--primary))';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
        el.style.cursor = 'pointer';
        el.style.transition = 'all 0.3s ease';
        el.style.overflow = 'hidden';
        el.style.backgroundColor = 'hsl(var(--background))';
        
        // Adicionar imagem de perfil
        if (profile.avatar_url) {
          el.style.backgroundImage = `url(${profile.avatar_url})`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        } else {
          // Avatar padrão com iniciais
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.backgroundColor = 'hsl(var(--primary))';
          el.style.color = 'hsl(var(--primary-foreground))';
          el.style.fontSize = '20px';
          el.style.fontWeight = 'bold';
          const initials = profile.full_name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          el.textContent = initials;
        }
        
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.15)';
          el.style.zIndex = '1000';
        });
        
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        });

        const popup = new mapboxgl.Popup({ 
          offset: 35, 
          className: 'family-popup',
          closeButton: false
        }).setHTML(
          `<div style="padding: 16px; min-width: 200px; text-align: center;">
            ${profile.avatar_url ? 
              `<img src="${profile.avatar_url}" 
                    style="width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 12px; display: block; object-fit: cover; border: 2px solid hsl(var(--primary));" />` 
              : ''}
            <h3 style="margin: 0 0 8px 0; font-weight: bold; font-size: 16px; color: hsl(var(--foreground));">${profile.full_name}</h3>
            <p style="margin: 0; font-size: 13px; color: hsl(var(--muted-foreground));">${profile.location || 'Localização não especificada'}</p>
          </div>`
        );

        new mapboxgl.Marker(el)
          .setLngLat([profile.longitude as number, profile.latitude as number])
          .setPopup(popup)
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
            Clique nas fotos dos membros da família para ver mais detalhes.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default MapVisualization;
