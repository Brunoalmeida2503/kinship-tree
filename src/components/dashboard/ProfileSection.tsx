import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';

export function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { themeColor, setThemeColor } = useTheme();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    full_name: '',
    birth_date: '',
    bio: '',
    location: '',
    avatar_url: '',
    latitude: null as number | null,
    longitude: null as number | null,
    language: 'pt-BR'
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    if (data) {
      const userLanguage = data.language || 'pt-BR';
      setProfile({
        full_name: data.full_name || '',
        birth_date: data.birth_date || '',
        bio: data.bio || '',
        location: data.location || '',
        avatar_url: data.avatar_url || '',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        language: userLanguage
      });
      // Update i18n language
      i18n.changeLanguage(userLanguage);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      if (!user) return;

      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      
      toast({
        title: t('profile.photoUpdated'),
        description: t('profile.photoUpdatedDescription')
      });
    } catch (error: any) {
      toast({
        title: t('profile.uploadError'),
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', user.id);

    if (error) {
      toast({
        title: t('profile.saveError'),
        description: error.message,
        variant: 'destructive'
      });
    } else {
      // Update i18n language
      i18n.changeLanguage(profile.language);
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDescription')
      });
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.title')}</CardTitle>
        <CardDescription>{t('profile.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback>
                {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              {uploading ? t('profile.uploading') : t('profile.changePhoto')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">{t('profile.fullName')}</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">{t('profile.birthDate')}</Label>
            <Input
              id="birth_date"
              type="date"
              value={profile.birth_date}
              onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t('profile.location')}</Label>
            <Input
              id="location"
              placeholder={t('profile.locationPlaceholder')}
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">{t('profile.language')}</Label>
            <Select
              value={profile.language}
              onValueChange={(value) => setProfile({ ...profile, language: value })}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">{t('languages.pt-BR')}</SelectItem>
                <SelectItem value="en">{t('languages.en')}</SelectItem>
                <SelectItem value="es">{t('languages.es')}</SelectItem>
                <SelectItem value="fr">{t('languages.fr')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme_color">Cor do Tema</Label>
            <Select
              value={themeColor}
              onValueChange={(value) => setThemeColor(value as 'white' | 'green')}
            >
              <SelectTrigger id="theme_color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">Branco (Padrão)</SelectItem>
                <SelectItem value="green">Verde</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">{t('profile.latitude')}</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                placeholder="-23.550520"
                value={profile.latitude || ''}
                onChange={(e) => setProfile({ ...profile, latitude: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">{t('profile.longitude')}</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                placeholder="-46.633308"
                value={profile.longitude || ''}
                onChange={(e) => setProfile({ ...profile, longitude: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {t('profile.coordinatesHelper')}{' '}
            <a 
              href="https://www.google.com/maps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Maps
            </a>
          </p>

          <div className="space-y-2">
            <Label htmlFor="bio">{t('profile.bio')}</Label>
            <Textarea
              id="bio"
              placeholder={t('profile.bioPlaceholder')}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={4}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? t('profile.saving') : t('profile.saveProfile')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
