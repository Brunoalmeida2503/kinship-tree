import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import heroTree from "@/assets/hero-tree.jpg";
import logo from "@/assets/logo.png";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-subtle">
      <div 
        className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage: `url(${heroTree})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="mb-8 animate-slide-up">
            <img src={logo} alt="Tree Logo" className="h-32 w-auto mx-auto" />
          </div>
          
          <p className="text-xl md:text-2xl text-foreground/80 mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            A rede social que une gerações
          </p>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.3s' }}>
            Construa sua árvore genealógica, conecte-se com familiares e descubra as histórias que unem sua família através das gerações.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button variant="hero" size="xl">
              <Users className="w-5 h-5" />
              Começar Agora
            </Button>
            <Button variant="outline" size="xl">
              Saiba Mais
            </Button>
          </div>
          
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">10k+</div>
              <div className="text-sm text-muted-foreground">Famílias Conectadas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">50k+</div>
              <div className="text-sm text-muted-foreground">Conexões Criadas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">100k+</div>
              <div className="text-sm text-muted-foreground">Histórias Compartilhadas</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
