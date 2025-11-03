import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export function useLanguageSync() {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!user) return;

    const loadUserLanguage = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data?.language) {
        i18n.changeLanguage(data.language);
      }
    };

    loadUserLanguage();

    // Subscribe to profile changes to sync language in real-time
    const channel = supabase
      .channel('profile-language-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new?.language) {
            i18n.changeLanguage(payload.new.language);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, i18n]);
}
