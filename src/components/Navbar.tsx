import { Button } from "@/components/ui/button";
import { TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer" onClick={() => navigate("/")}>
            <TreePine className="w-6 h-6" />
            <span>Tree</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground/80 hover:text-primary transition-colors">
              Recursos
            </a>
            <a href="#how-it-works" className="text-foreground/80 hover:text-primary transition-colors">
              Como Funciona
            </a>
            <a href="#about" className="text-foreground/80 hover:text-primary transition-colors">
              Sobre
            </a>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Entrar
            </Button>
            <Button variant="default" onClick={() => navigate("/auth")}>
              Começar
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
