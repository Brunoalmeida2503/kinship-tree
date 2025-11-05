import { Card, CardContent } from "@/components/ui/card";
import { Users, GitBranch, UsersRound, Network } from "lucide-react";
import featureConnections from "@/assets/feature-connections.jpg";
import featureTree from "@/assets/feature-tree.jpg";
import featureGroups from "@/assets/feature-groups.jpg";

const FeaturesSection = () => {
  const features = [
    {
      icon: Users,
      title: "Conexões Familiares",
      description: "Conecte-se com seus familiares indicando o grau de parentesco. Cada conexão precisa ser confirmada para garantir autenticidade.",
      image: featureConnections,
    },
    {
      icon: GitBranch,
      title: "Árvore Genealógica",
      description: "Visualize sua família em formato de árvore genealógica interativa. Explore gerações e descubra as ramificações da sua história.",
      image: featureTree,
    },
    {
      icon: UsersRound,
      title: "Famílias que a Vida Uniu",
      description: "Crie grupos com amigos da faculdade, trabalho ou qualquer comunidade. Porque família não é só sangue.",
      image: featureGroups,
    },
    {
      icon: Network,
      title: "Seis Graus de Separação",
      description: "Descubra conexões surpreendentes. Veja como você está conectado a outras pessoas através da sua rede.",
      image: null,
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 animate-fade-in px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 text-foreground">
            Como Funciona
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Uma nova forma de preservar e compartilhar sua história familiar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {feature.image && (
                <div className="h-40 sm:h-44 md:h-48 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              )}
              <CardContent className="p-4 sm:p-5 md:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors flex-shrink-0">
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
