import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Missions from "./pages/Missions";
import Memories from "./pages/Memories";
import Profile from "./pages/Profile";
import Group from "./pages/Group";
import GroupTimeline from "./pages/GroupTimeline";
import GroupMemories from "./pages/GroupMemories";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
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
                    <main className="flex-1 flex flex-col">
                      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
                        <SidebarTrigger />
                        <h1 className="text-lg font-semibold">Echos</h1>
                      </header>
                      <div className="flex-1 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Feed />} />
                          <Route path="/tree" element={<Dashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/missions" element={<Missions />} />
                          <Route path="/memories" element={<Memories />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/group/:groupId" element={<Group />} />
                          <Route path="/group/:groupId/timeline" element={<GroupTimeline />} />
                          <Route path="/group/:groupId/memories" element={<GroupMemories />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </div>
                    </main>
                  </div>
                </SidebarProvider>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
