import { Button } from "@/components/ui/button";
import { TreePine } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-black/10" />
      
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <div className="animate-fade-in">
          <TreePine className="w-16 h-16 mx-auto mb-6 text-primary-foreground animate-float" />
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary-foreground">
            Comece sua Jornada Genealógica
          </h2>
          
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de famílias que já estão preservando suas histórias e criando conexões significativas.
          </p>
          
          <Button 
            variant="secondary" 
            size="xl"
            className="shadow-2xl hover:shadow-3xl"
          >
            Criar Minha Árvore Gratuita
          </Button>
          
          <p className="mt-6 text-sm text-primary-foreground/70">
            Grátis para sempre • Sem cartão de crédito necessário
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
