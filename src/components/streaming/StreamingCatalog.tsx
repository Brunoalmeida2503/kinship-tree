import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Film, 
  Plus,
  Star,
  Tv,
  Play
} from "lucide-react";

export interface CatalogItem {
  id: string;
  title: string;
  year: number;
  media_type: "movie" | "series";
  poster_url: string;
  rating?: number;
  tmdb_id?: string;
}

interface StreamingCatalogProps {
  onAddToHistory: (item: CatalogItem, serviceId: string) => void;
}

// Catálogo de títulos populares por streaming service
const catalogData: Record<string, CatalogItem[]> = {
  netflix: [
    { id: "n1", title: "Stranger Things", year: 2016, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg", rating: 8.7, tmdb_id: "66732" },
    { id: "n2", title: "La Casa de Papel", year: 2017, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg", rating: 8.3, tmdb_id: "71446" },
    { id: "n3", title: "Wednesday", year: 2022, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg", rating: 8.1, tmdb_id: "119051" },
    { id: "n4", title: "The Crown", year: 2016, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/1M876KPjulVwppEpldhdc8V4o68.jpg", rating: 8.2, tmdb_id: "65494" },
    { id: "n5", title: "Ozark", year: 2017, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/pCGyPVrI9Fzw6vspiyEqfiJdPm7.jpg", rating: 8.5, tmdb_id: "69740" },
    { id: "n6", title: "Você", year: 2018, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/7bEYwjOJqM3W2rNXWh05rQgFYTc.jpg", rating: 7.7, tmdb_id: "78191" },
    { id: "n7", title: "Bridgerton", year: 2020, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/luoKpgVwi1E5nQsi7W0UuKHu2Rq.jpg", rating: 7.3, tmdb_id: "91239" },
    { id: "n8", title: "Round 6", year: 2021, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", rating: 7.8, tmdb_id: "93405" },
    { id: "n9", title: "Não Olhe para Cima", year: 2021, media_type: "movie", poster_url: "https://image.tmdb.org/t/p/w500/th4E1yqsE8DGpAseLiUrI60Hf8V.jpg", rating: 7.2, tmdb_id: "646380" },
    { id: "n10", title: "Glass Onion", year: 2022, media_type: "movie", poster_url: "https://image.tmdb.org/t/p/w500/vDGr1YdrlfbU9wxTOdpf3zChmv9.jpg", rating: 7.1, tmdb_id: "661374" },
  ],
  prime: [
    { id: "p1", title: "The Boys", year: 2019, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/stTEycfG9928HYGEISBFaG1ngjM.jpg", rating: 8.7, tmdb_id: "76479" },
    { id: "p2", title: "O Senhor dos Anéis: Os Anéis de Poder", year: 2022, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/mYLOqiStMxDK3fYZFirgrMt8z5d.jpg", rating: 7.5, tmdb_id: "84773" },
    { id: "p3", title: "Reacher", year: 2022, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/jFINvMHNaEvrddVadxrkXcJgvHQ.jpg", rating: 8.1, tmdb_id: "108978" },
    { id: "p4", title: "The Marvelous Mrs. Maisel", year: 2017, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/fV8z3sCPr0gTao3NeE5AK8DJQUC.jpg", rating: 8.0, tmdb_id: "70796" },
    { id: "p5", title: "Fleabag", year: 2016, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/27vEYsRKa3eAniwmvLBqhsLwP9E.jpg", rating: 8.7, tmdb_id: "67070" },
    { id: "p6", title: "Jack Ryan", year: 2018, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/z88hGlxadPRjwmxNQN6WI6Qb4Z7.jpg", rating: 7.9, tmdb_id: "73375" },
    { id: "p7", title: "Citadel", year: 2023, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/ai1B7JMlAc5P2pYxOlINCQDqnfs.jpg", rating: 6.8, tmdb_id: "114472" },
    { id: "p8", title: "Gen V", year: 2023, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/uuot1N5AgZ7xRCKgE0JqH4yFeY7.jpg", rating: 8.0, tmdb_id: "106541" },
  ],
  disney: [
    { id: "d1", title: "The Mandalorian", year: 2019, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/eU1i6eHXlzMOlEq0ku1Rzq7Y4wA.jpg", rating: 8.5, tmdb_id: "82856" },
    { id: "d2", title: "Loki", year: 2021, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/kEl2t3OhXc3Zb9FBh1AuYzRTgZp.jpg", rating: 8.2, tmdb_id: "84958" },
    { id: "d3", title: "WandaVision", year: 2021, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/glKDfE6btIRcVB5zrjspRIs4r52.jpg", rating: 8.0, tmdb_id: "85271" },
    { id: "d4", title: "Ahsoka", year: 2023, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/laCJxobHoPVaLQTKxc14Y2zV64J.jpg", rating: 7.6, tmdb_id: "114461" },
    { id: "d5", title: "O Urso", year: 2022, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg", rating: 8.6, tmdb_id: "136315" },
    { id: "d6", title: "Andor", year: 2022, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/59SVNwLfoMnZPPB6ukW6dlPxAdI.jpg", rating: 8.4, tmdb_id: "83867" },
    { id: "d7", title: "Only Murders in the Building", year: 2021, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/8XAQdVT3eKxTyQPggbpBtdf37bp.jpg", rating: 8.1, tmdb_id: "107113" },
    { id: "d8", title: "O Assassinato de Gianni Versace", year: 2018, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/j5m7Q9drvVyZhG8T49j3ELgvmD7.jpg", rating: 8.0, tmdb_id: "67136" },
  ],
  hbo: [
    { id: "h1", title: "House of the Dragon", year: 2022, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg", rating: 8.4, tmdb_id: "94997" },
    { id: "h2", title: "The Last of Us", year: 2023, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg", rating: 8.8, tmdb_id: "100088" },
    { id: "h3", title: "Succession", year: 2018, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg", rating: 8.9, tmdb_id: "76331" },
    { id: "h4", title: "Euphoria", year: 2019, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/jtnfNzqZwN4E32FGGxx1YZaBWWf.jpg", rating: 8.4, tmdb_id: "85552" },
    { id: "h5", title: "White Lotus", year: 2021, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/lH5nKeccBfWMXY3Cxah68TqQDLn.jpg", rating: 8.0, tmdb_id: "110316" },
    { id: "h6", title: "Game of Thrones", year: 2011, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg", rating: 8.4, tmdb_id: "1399" },
    { id: "h7", title: "True Detective", year: 2014, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/cuV2O5ZyDLHSOWzg3nLVljp1ubw.jpg", rating: 8.3, tmdb_id: "46648" },
    { id: "h8", title: "Barry", year: 2018, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/uPIkuaKQHQ5Un4CIQP19wLNd8qf.jpg", rating: 8.4, tmdb_id: "75219" },
  ],
  youtube: [
    { id: "y1", title: "Cobra Kai", year: 2018, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/6POBWybSBDBKjSs1VAQcnQC1qyt.jpg", rating: 8.1, tmdb_id: "77169" },
    { id: "y2", title: "Wayne", year: 2019, media_type: "series", poster_url: "https://image.tmdb.org/t/p/w500/oQT3b2W7qv1Lb2rFgWkxLvIJfLi.jpg", rating: 8.1, tmdb_id: "81040" },
  ],
};

const streamingServices = [
  { id: "netflix", name: "Netflix", color: "#E50914", icon: "N" },
  { id: "prime", name: "Prime Video", color: "#00A8E1", icon: "P" },
  { id: "disney", name: "Disney+", color: "#113CCF", icon: "D" },
  { id: "hbo", name: "Max", color: "#5822B4", icon: "M" },
  { id: "youtube", name: "YouTube", color: "#FF0000", icon: "Y" },
];

const StreamingCatalog = ({ onAddToHistory }: StreamingCatalogProps) => {
  const [activeService, setActiveService] = useState("netflix");

  const renderCatalogCard = (item: CatalogItem, serviceId: string) => (
    <Card 
      key={item.id} 
      className="flex-shrink-0 w-36 overflow-hidden group cursor-pointer hover:shadow-lg transition-all"
    >
      <div className="relative">
        <img 
          src={item.poster_url} 
          alt={item.title}
          className="w-full h-52 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Image';
          }}
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button 
            size="sm" 
            onClick={() => onAddToHistory(item, serviceId)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
        {item.rating && (
          <div className="absolute top-2 right-2 bg-black/70 rounded-full px-2 py-1 flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-white font-medium">{item.rating}</span>
          </div>
        )}
        <Badge 
          className="absolute bottom-2 left-2 text-xs"
          variant="secondary"
        >
          {item.media_type === "series" ? <Tv className="h-3 w-3 mr-1" /> : <Film className="h-3 w-3 mr-1" />}
          {item.year}
        </Badge>
      </div>
      <div className="p-2">
        <p className="text-sm font-medium line-clamp-2">{item.title}</p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Play className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Catálogo Popular</h2>
      </div>

      <Tabs value={activeService} onValueChange={setActiveService}>
        <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-2 bg-transparent p-0">
          {streamingServices.map((service) => (
            <TabsTrigger 
              key={service.id} 
              value={service.id}
              className="data-[state=active]:text-white px-4 py-2 rounded-full transition-all"
              style={{
                backgroundColor: activeService === service.id ? service.color : 'transparent',
                borderColor: service.color,
                borderWidth: '2px',
                color: activeService === service.id ? 'white' : service.color,
              }}
            >
              {service.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {streamingServices.map((service) => (
          <TabsContent key={service.id} value={service.id} className="mt-4">
            {catalogData[service.id] && catalogData[service.id].length > 0 ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-4">
                  {catalogData[service.id].map((item) => renderCatalogCard(item, service.id))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <Card className="p-8 text-center">
                <Film className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground">Nenhum título disponível</p>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default StreamingCatalog;
