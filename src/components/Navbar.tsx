import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Tree Logo" className="h-10 w-auto" />
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
            {user ? (
              <>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button variant="default" onClick={handleLogout}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>
                  Entrar
                </Button>
                <Button variant="default" onClick={() => navigate("/auth")}>
                  Começar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
