import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin } from "lucide-react";

interface MissionMapProps {
  path: any[];
  targetProfile?: {
    full_name: string;
    avatar_url: string;
  };
}

export const MissionMap = ({ path, targetProfile }: MissionMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Check if Mapbox token is available
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    if (!mapboxToken) {
      setMapError("Token do Mapbox não configurado. Configure VITE_MAPBOX_TOKEN nas variáveis de ambiente.");
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-46.6333, -23.5505], // São Paulo as default
        zoom: 4,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Add markers for path nodes
      if (Array.isArray(path) && path.length > 0) {
        path.forEach((node, index) => {
          if (node.latitude && node.longitude) {
            const el = document.createElement("div");
            el.className = "mission-marker";
            el.style.backgroundColor = "#8B5CF6";
            el.style.width = "30px";
            el.style.height = "30px";
            el.style.borderRadius = "50%";
            el.style.border = "3px solid white";
            el.style.cursor = "pointer";
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.style.color = "white";
            el.style.fontWeight = "bold";
            el.style.fontSize = "12px";
            el.textContent = (index + 1).toString();

            new mapboxgl.Marker(el)
              .setLngLat([node.longitude, node.latitude])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                  `<div class="p-2">
                    <p class="font-semibold">${node.name}</p>
                    <p class="text-xs text-muted-foreground">Grau ${index}</p>
                  </div>`
                )
              )
              .addTo(map.current!);
          }
        });

        // Fit map to show all markers
        if (path.some(node => node.latitude && node.longitude)) {
          const bounds = new mapboxgl.LngLatBounds();
          path.forEach(node => {
            if (node.latitude && node.longitude) {
              bounds.extend([node.longitude, node.latitude]);
            }
          });
          map.current.fitBounds(bounds, { padding: 50 });
        }
      }

      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("Erro ao inicializar o mapa. Verifique a configuração do Mapbox.");
    }
  }, [path]);

  if (mapError) {
    return (
      <Card className="p-6">
        <Alert>
          <MapPin className="h-4 w-4" />
          <AlertDescription>{mapError}</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Visualização no Mapa
      </h3>
      <div 
        ref={mapContainer} 
        className="w-full h-[500px] rounded-lg overflow-hidden"
      />
      {(!path || path.length === 0) && (
        <p className="text-sm text-muted-foreground text-center mt-4">
          O mapa será atualizado conforme você progride na missão
        </p>
      )}
    </Card>
  );
};
