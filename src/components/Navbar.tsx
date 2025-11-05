import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "./notifications/NotificationBell";
import logo from "@/assets/logo.png";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Tree Logo" className="h-8 sm:h-10 w-auto" />
          </div>
          
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <a href="#features" className="text-sm text-foreground/80 hover:text-primary transition-colors">
              {t('navbar.features')}
            </a>
            <a href="#how-it-works" className="text-sm text-foreground/80 hover:text-primary transition-colors">
              {t('navbar.howItWorks')}
            </a>
            <a href="#about" className="text-sm text-foreground/80 hover:text-primary transition-colors">
              {t('navbar.about')}
            </a>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            {user ? (
              <>
                <NotificationBell />
                <Button variant="ghost" onClick={() => navigate("/dashboard")} size="sm" className="text-xs sm:text-sm">
                  {t('navbar.dashboard')}
                </Button>
                <Button variant="default" onClick={handleLogout} size="sm" className="hidden sm:flex text-xs sm:text-sm">
                  {t('navbar.logout')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")} size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
                  {t('navbar.login')}
                </Button>
                <Button variant="default" onClick={() => navigate("/auth")} size="sm" className="text-xs sm:text-sm px-2 sm:px-4">
                  {t('navbar.getStarted')}
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
