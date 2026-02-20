import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectionsSection } from '@/components/dashboard/ConnectionsSection';
import { GroupsSection } from '@/components/dashboard/GroupsSection';
import { TreeVisualization } from '@/components/dashboard/TreeVisualization';
import MapVisualization from '@/components/dashboard/MapVisualization';
import { LogOut, Users, Network, TreePine, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('tree');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">{t('dashboard.loading')}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visualize suas conexões e árvore genealógica</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="mr-2 h-4 w-4" />
            {t('dashboard.logout')}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="w-auto inline-flex">
            <TabsTrigger value="tree" className="flex items-center gap-2 text-sm">
              <TreePine className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dashboard.tree')}</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2 text-sm">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dashboard.map')}</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-2 text-sm">
              <Network className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dashboard.connections')}</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('dashboard.groups')}</span>
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
        </Tabs>
      </main>
    </div>
  );
}
