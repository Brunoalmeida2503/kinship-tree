import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSection } from '@/components/dashboard/ProfileSection';
import { ConnectionsSection } from '@/components/dashboard/ConnectionsSection';
import { GroupsSection } from '@/components/dashboard/GroupsSection';
import { TreeVisualization } from '@/components/dashboard/TreeVisualization';
import MapVisualization from '@/components/dashboard/MapVisualization';
import { LogOut, Users, Network, TreePine, UserCircle, Map } from 'lucide-react';

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tree');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background-start to-background-end">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-start to-background-end">
      <header className="border-b border-border-subtle bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Tree</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="tree" className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              <span className="hidden sm:inline">Árvore</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">Conexões</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Grupos</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tree" className="space-y-4">
            <TreeVisualization />
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <MapVisualization />
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <ConnectionsSection />
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <GroupsSection />
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <ProfileSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
