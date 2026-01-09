import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuraButton } from "@/components/aura/AuraButton";
import { useLanguageSync } from "@/hooks/useLanguageSync";
import { useEchosNotifications } from "@/hooks/useEchosNotifications";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Missions from "./pages/Missions";
import MissionActive from "./pages/MissionActive";
import MissionHistory from "./pages/MissionHistory";
import MissionExplore from "./pages/MissionExplore";
import Memories from "./pages/Memories";
import Profile from "./pages/Profile";
import Group from "./pages/Group";
import GroupTimeline from "./pages/GroupTimeline";
import GroupMemories from "./pages/GroupMemories";
import Groups from "./pages/Groups";
import Suggestions from "./pages/Suggestions";
import Echos from "./pages/Echos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useLanguageSync();
  useEchosNotifications(); // Notificações de novas mensagens
  
  return (
    <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Rotas com Sidebar */}
            <Route
              path="/*"
              element={
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <main className="flex-1 flex flex-col min-w-0">
                      <header className="sticky top-0 z-10 flex h-12 sm:h-14 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-6">
                        <SidebarTrigger />
                        <h1 className="text-base sm:text-lg font-semibold truncate">Echos</h1>
                      </header>
                      <div className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Feed />} />
                          <Route path="/echos" element={<Echos />} />
                          <Route path="/tree" element={<Dashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/missions" element={<Missions />} />
                          <Route path="/missions/active" element={<MissionActive />} />
                          <Route path="/missions/history" element={<MissionHistory />} />
                          <Route path="/missions/:id" element={<MissionExplore />} />
                          <Route path="/memories" element={<Memories />} />
                          <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/group/:groupId" element={<Group />} />
              <Route path="/group/:groupId/timeline" element={<GroupTimeline />} />
              <Route path="/group/:groupId/memories" element={<GroupMemories />} />
                          <Route path="/suggestions" element={<Suggestions />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </main>
                    <AuraButton />
                  </div>
                </SidebarProvider>
              }
            />
          </Routes>
        </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
