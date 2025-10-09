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
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Como Funciona
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Uma nova forma de preservar e compartilhar sua história familiar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {feature.image && (
                <div className="h-48 overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
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
