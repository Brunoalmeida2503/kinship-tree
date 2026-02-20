import { Home, User, Target, Images, LogOut, GitBranch, Users, Sparkles, MessageCircle, Globe } from "lucide-react";
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
import { useState, useEffect } from "react";

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const { t } = useTranslation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const [worldEnabled, setWorldEnabled] = useState(false);

  useEffect(() => {
    const fetchWorldEnabled = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('world_enabled')
        .eq('id', user.id)
        .single();
      if (data) {
        setWorldEnabled(data.world_enabled || false);
      }
    };
    fetchWorldEnabled();
  }, [user]);

  const baseMenuItems = [
    { title: t('sidebar.seasons'), url: "/", icon: Home },
    { title: t('sidebar.tree'), url: "/tree", icon: GitBranch },
    { title: t('sidebar.memories'), url: "/memories", icon: Images },
    { title: "Echos", url: "/echos", icon: MessageCircle },
    { title: "Sugestões", url: "/suggestions", icon: Sparkles },
    { title: t('sidebar.groups'), url: "/groups", icon: Users },
    { title: t('sidebar.missions'), url: "/missions", icon: Target },
  ];

  const menuItems = worldEnabled
    ? [...baseMenuItems, { title: "World", url: "/world", icon: Globe }, { title: t('sidebar.profile'), url: "/profile", icon: User }]
    : [...baseMenuItems, { title: t('sidebar.profile'), url: "/profile", icon: User }];
  
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
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center justify-center px-4 py-4">
          <img src={currentLogo} alt="Tree Logo" className={collapsed ? "h-10 w-auto" : "h-14 w-auto transition-all duration-200"} />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-1">{t('sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} className="rounded-lg h-9 px-3">
                    <NavLink to={item.url} end onClick={handleNavClick}>
                      <item.icon className="shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground hover:text-destructive rounded-lg h-9">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2"
              >
                <LogOut className="shrink-0" />
                <span>{t('sidebar.logout')}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
