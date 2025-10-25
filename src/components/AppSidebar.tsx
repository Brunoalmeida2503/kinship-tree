import { Home, User, Target, Images, LogOut, GitBranch, Users } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import { useTheme } from "@/contexts/ThemeContext";
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

const menuItems = [
  { title: "Timeline", url: "/", icon: Home },
  { title: "Árvore", url: "/tree", icon: GitBranch },
  { title: "Grupos", url: "/groups", icon: Users },
  { title: "Missões", url: "/missions", icon: Target },
  { title: "Memórias", url: "/memories", icon: Images },
  { title: "Perfil", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  
  const currentLogo = themeColor === 'green' ? logoDark : logo;

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
        <div className={`flex items-center px-4 py-3 ${collapsed ? 'justify-center' : ''}`}>
          <img src={currentLogo} alt="Tree Logo" className={collapsed ? "h-8 w-auto" : "h-10 w-auto"} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
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
                <span>Sair</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
