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
import { Switch } from '@/components/ui/switch';
import { Camera, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchCountries, fetchStates, fetchCities, fetchCoordinates, Country, State, City } from '@/services/geoService';
import { profileSchema } from '@/lib/validation';
import { z } from 'zod';

export function ProfileSection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { themeColor, setThemeColor } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profile, setProfile] = useState({
    full_name: '',
    birth_date: '',
    bio: '',
    location: '',
    avatar_url: '',
    latitude: null as number | null,
    longitude: null as number | null,
    language: 'pt-BR',
    country: '',
    state: '',
    city: '',
    world_enabled: false
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  useEffect(() => {
    loadCountries();
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadCountries = async () => {
    const countriesData = await fetchCountries();
    setCountries(countriesData);
  };

  const loadProfile = async () => {
    if (!user) return;

    setLoadingProfile(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive'
      });
      setLoadingProfile(false);
      return;
    }

    if (data) {
      const userLanguage = data.language || 'pt-BR';
      const profileData = {
        full_name: data.full_name || '',
        birth_date: data.birth_date || '',
        bio: data.bio || '',
        location: data.location || '',
        avatar_url: data.avatar_url || '',
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
        language: userLanguage,
        country: data.country || '',
        state: data.state || '',
        city: data.city || '',
        world_enabled: data.world_enabled || false
      };
      
      setProfile(profileData);
      
      // Update i18n language
      i18n.changeLanguage(userLanguage);
      
      // Load states if country exists
      if (data.country) {
        const loadStatesAsync = async () => {
          setLoadingGeo(true);
          const statesData = await fetchStates(data.country);
          setStates(statesData);
          setLoadingGeo(false);
        };
        loadStatesAsync();
      }
      
      // Load cities if state exists
      if (data.country && data.state) {
        const loadCitiesAsync = async () => {
          setLoadingGeo(true);
          const citiesData = await fetchCities(data.country, data.state);
          setCities(citiesData);
          setLoadingGeo(false);
        };
        loadCitiesAsync();
      }
    } else {
      // Se não há dados, criar perfil inicial
      toast({
        title: 'Perfil não encontrado',
        description: 'Criando perfil inicial...',
        variant: 'default'
      });
    }
    
    setLoadingProfile(false);
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

    // Validate input
    try {
      profileSchema.parse({
        full_name: profile.full_name,
        bio: profile.bio,
        birth_date: profile.birth_date,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        latitude: profile.latitude ? Number(profile.latitude) : undefined,
        longitude: profile.longitude ? Number(profile.longitude) : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('profile.validationError'),
          description: error.errors[0].message,
          variant: 'destructive'
        });
        return;
      }
    }

    setLoading(true);

    const updateData = {
      full_name: profile.full_name,
      birth_date: profile.birth_date || null,
      bio: profile.bio || null,
      location: profile.location || null,
      latitude: profile.latitude,
      longitude: profile.longitude,
      language: profile.language,
      country: profile.country || null,
      state: profile.state || null,
      city: profile.city || null,
      world_enabled: profile.world_enabled
    };

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
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
      // Update theme color in profile
      await supabase
        .from('profiles')
        .update({ theme_color: themeColor })
        .eq('id', user.id);
      
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdatedDescription')
      });
      
      // Recarregar perfil após salvar
      await loadProfile();
    }

    setLoading(false);
  };

  const handleCountryChange = async (countryName: string) => {
    setProfile({ ...profile, country: countryName, state: '', city: '', latitude: null, longitude: null });
    setStates([]);
    setCities([]);
    
    if (countryName) {
      setLoadingGeo(true);
      const statesData = await fetchStates(countryName);
      setStates(statesData);
      setLoadingGeo(false);
    }
  };

  const handleStateChange = async (stateName: string, countryName?: string) => {
    const country = countryName || profile.country;
    setProfile({ ...profile, state: stateName, city: '', latitude: null, longitude: null });
    setCities([]);
    
    if (stateName && country) {
      setLoadingGeo(true);
      const citiesData = await fetchCities(country, stateName);
      setCities(citiesData);
      setLoadingGeo(false);
    }
  };

  const handleCityChange = async (cityName: string) => {
    setProfile({ ...profile, city: cityName });
    
    if (cityName && profile.state && profile.country) {
      setLoadingGeo(true);
      const coords = await fetchCoordinates(cityName, profile.state, profile.country);
      setLoadingGeo(false);
      
      if (coords) {
        setProfile(prev => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude
        }));
        toast({
          title: t('profile.coordinatesUpdated') || 'Coordenadas atualizadas',
          description: t('profile.coordinatesUpdatedDescription') || 'Latitude e longitude preenchidas automaticamente'
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.title')}</CardTitle>
        <CardDescription>{t('profile.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loadingProfile || authLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
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
            <Label htmlFor="country">{t('profile.country') || 'País'}</Label>
            <Select
              value={profile.country}
              onValueChange={handleCountryChange}
              disabled={loadingGeo}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder={t('profile.selectCountry') || 'Selecione um país'} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.iso2} value={country.name}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">{t('profile.state') || 'Estado'}</Label>
            <Select
              value={profile.state}
              onValueChange={(value) => handleStateChange(value)}
              disabled={!profile.country || loadingGeo}
            >
              <SelectTrigger id="state">
                <SelectValue placeholder={t('profile.selectState') || 'Selecione um estado'} />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.state_code} value={state.name}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">{t('profile.city') || 'Cidade'}</Label>
            <Select
              value={profile.city}
              onValueChange={handleCityChange}
              disabled={!profile.state || loadingGeo}
            >
              <SelectTrigger id="city">
                <SelectValue placeholder={t('profile.selectCity') || 'Selecione uma cidade'} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.name} value={city.name}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              onValueChange={(value) => {
                setProfile({ ...profile, language: value });
                i18n.changeLanguage(value);
              }}
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
              onValueChange={(value) => setThemeColor(value as 'white' | 'green' | 'echo')}
            >
              <SelectTrigger id="theme_color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">Branco (Padrão)</SelectItem>
                <SelectItem value="green">Verde</SelectItem>
                <SelectItem value="echo">Verde Claro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="world_enabled" className="font-medium">Habilitar World</Label>
                <p className="text-sm text-muted-foreground">
                  Acesse serviços externos como streaming, shopping e mais
                </p>
              </div>
            </div>
            <Switch
              id="world_enabled"
              checked={profile.world_enabled}
              onCheckedChange={(checked) => setProfile({ ...profile, world_enabled: checked })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        )}

        {!loadingProfile && !authLoading && (
          <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Alterar Senha</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (newPassword !== confirmPassword) {
              toast({
                title: 'Erro',
                description: 'As senhas não coincidem',
                variant: 'destructive'
              });
              return;
            }
            if (newPassword.length < 6) {
              toast({
                title: 'Erro',
                description: 'A senha deve ter no mínimo 6 caracteres',
                variant: 'destructive'
              });
              return;
            }
            setChangingPassword(true);
            const { error } = await supabase.auth.updateUser({
              password: newPassword
            });
            if (error) {
              toast({
                title: 'Erro ao alterar senha',
                description: error.message,
                variant: 'destructive'
              });
            } else {
              toast({
                title: 'Senha alterada',
                description: 'Sua senha foi alterada com sucesso'
              });
              setNewPassword('');
              setConfirmPassword('');
            }
            setChangingPassword(false);
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
