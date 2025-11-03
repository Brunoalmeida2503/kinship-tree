import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MemoryGallery } from '@/components/memories/MemoryGallery';
import { MemoryCalendar } from '@/components/memories/MemoryCalendar';
import { AddMemoryDialog } from '@/components/memories/AddMemoryDialog';
import { Button } from '@/components/ui/button';
import { Calendar, Grid, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Memories() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<'gallery' | 'calendar'>('gallery');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary to-background">
        <div className="text-lg">{t('memories.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{t('memories.title')}</h1>
            <p className="text-muted-foreground">
              {t('memories.description')}
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            {t('memories.newMemory')}
          </Button>
        </div>

        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'gallery' | 'calendar')} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              {t('memories.gallery')}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('memories.calendar')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-4">
            <MemoryGallery />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <MemoryCalendar />
          </TabsContent>
        </Tabs>

        <AddMemoryDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
        />
      </div>
    </div>
  );
}
