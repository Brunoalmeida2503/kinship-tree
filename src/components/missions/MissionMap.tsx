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

const MAPBOX_TOKEN = 'pk.eyJ1IjoidHJlZS1zb2NpYWwiLCJhIjoiY21nbTlid2J6MWU4NzJrcHFxbDc0NDhpZyJ9.BTX2-dUn_I-MyG-NBnL1Ew';

export const MissionMap = ({ path, targetProfile }: MissionMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-46.6333, -23.5505], // São Paulo as default
        zoom: 4,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Wait for map to load before adding sources and layers
      map.current.on('load', () => {
        if (!map.current) return;

        // Add markers and create line connecting them
        if (Array.isArray(path) && path.length > 0) {
          const coordinates: [number, number][] = [];

          path.forEach((node, index) => {
            if (node.latitude && node.longitude) {
              coordinates.push([node.longitude, node.latitude]);

              // Create numbered marker
              const el = document.createElement("div");
              el.className = "mission-marker";
              el.style.backgroundColor = "#8B5CF6";
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
              el.textContent = index.toString();

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

          // Add line connecting all points
          if (coordinates.length > 1) {
            map.current!.addSource('mission-path', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              }
            });

            map.current!.addLayer({
              id: 'mission-path-line',
              type: 'line',
              source: 'mission-path',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#8B5CF6',
                'line-width': 3,
                'line-opacity': 0.8
              }
            });

            // Add arrows/direction indicators
            map.current!.addLayer({
              id: 'mission-path-arrows',
              type: 'symbol',
              source: 'mission-path',
              layout: {
                'symbol-placement': 'line',
                'symbol-spacing': 100,
                'icon-image': 'arrow',
                'icon-size': 0.5,
                'icon-rotate': 90,
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              }
            });
          }

          // Fit map to show all markers
          if (path.some(node => node.latitude && node.longitude)) {
            const bounds = new mapboxgl.LngLatBounds();
            path.forEach(node => {
              if (node.latitude && node.longitude) {
                bounds.extend([node.longitude, node.latitude]);
              }
            });
            map.current!.fitBounds(bounds, { padding: 50 });
          }
        }
      });

      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }, [path]);

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
