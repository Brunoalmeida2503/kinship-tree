import { Button } from "@/components/ui/button";
import { TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-black/10" />
      
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <div className="animate-fade-in px-2">
          <TreePine className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 mx-auto mb-4 sm:mb-5 md:mb-6 text-primary-foreground animate-float" />
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5 md:mb-6 text-primary-foreground px-4">
            Comece sua Jornada Genealógica
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-primary-foreground/90 mb-6 sm:mb-7 md:mb-8 max-w-2xl mx-auto px-4">
            Junte-se a milhares de famílias que já estão preservando suas histórias e criando conexões significativas.
          </p>
          
          <Button 
            variant="secondary" 
            size="xl"
            className="shadow-2xl hover:shadow-3xl w-full sm:w-auto text-sm sm:text-base"
            onClick={() => navigate("/auth")}
          >
            Criar Minha Árvore Gratuita
          </Button>
          
          <p className="mt-4 sm:mt-5 md:mt-6 text-xs sm:text-sm text-primary-foreground/70 px-4">
            Grátis para sempre • Sem cartão de crédito necessário
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
