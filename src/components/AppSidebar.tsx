import { Home, User, Target, Images, LogOut, GitBranch, Users, Sparkles, MessageCircle } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import logoWhiteTheme from "@/assets/logo-white-theme.png";
import logoEcho from "@/assets/logo-echo.png";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const { t } = useTranslation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  
  const menuItems = [
    { title: t('sidebar.moments'), url: "/", icon: Home },
    { title: "Echos", url: "/echos", icon: MessageCircle },
    { title: t('sidebar.tree'), url: "/tree", icon: GitBranch },
    { title: t('sidebar.groups'), url: "/groups", icon: Users },
    { title: "Sugestões", url: "/suggestions", icon: Sparkles },
    { title: t('sidebar.missions'), url: "/missions", icon: Target },
    { title: t('sidebar.memories'), url: "/memories", icon: Images },
    { title: t('sidebar.profile'), url: "/profile", icon: User },
  ];
  
  const currentLogo = themeColor === 'white' ? logoWhiteTheme : themeColor === 'echo' ? logoEcho : logoDark;

  const isActive = (path: string) => currentPath === path;

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="w-56">
      <SidebarHeader>
        <div className="flex items-center justify-center px-4 py-3">
          <img src={currentLogo} alt="Tree Logo" className={collapsed ? "h-12 w-auto" : "h-16 w-auto"} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end onClick={handleNavClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2"
              >
                <LogOut />
                <span>{t('sidebar.logout')}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
