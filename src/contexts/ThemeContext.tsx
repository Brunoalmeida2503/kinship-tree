import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ThemeColor = 'white' | 'green' | 'echo';

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeColor, setThemeColorState] = useState<ThemeColor>('white');
  const { user } = useAuth();

  useEffect(() => {
    const loadTheme = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('theme_color')
        .eq('id', user.id)
        .single();

      if (data?.theme_color) {
        applyTheme(data.theme_color as ThemeColor);
        setThemeColorState(data.theme_color as ThemeColor);
      }
    };

    loadTheme();
  }, [user]);

  const applyTheme = (theme: ThemeColor) => {
    const root = document.documentElement;
    
    if (theme === 'green') {
      // Tema Verde com tom 192 100% 18%
      root.style.setProperty('--background', '192 100% 18%');
      root.style.setProperty('--foreground', '0 0% 100%');
      root.style.setProperty('--card', '192 100% 15%');
      root.style.setProperty('--card-foreground', '0 0% 100%');
      root.style.setProperty('--popover', '192 100% 15%');
      root.style.setProperty('--popover-foreground', '0 0% 100%');
      root.style.setProperty('--sidebar-background', '192 100% 18%');
      root.style.setProperty('--sidebar-foreground', '0 0% 100%');
      root.style.setProperty('--sidebar-accent', '192 100% 25%');
      root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%');
      root.style.setProperty('--muted', '192 100% 25%');
      root.style.setProperty('--muted-foreground', '0 0% 90%');
      root.style.setProperty('--border', '192 100% 30%');
      root.style.setProperty('--input', '192 100% 30%');
    } else if (theme === 'echo') {
      // Tema Verde Claro - hsl(147, 100%, 37%)
      root.style.setProperty('--background', '147 100% 37%');
      root.style.setProperty('--foreground', '0 0% 100%');
      root.style.setProperty('--card', '147 100% 33%');
      root.style.setProperty('--card-foreground', '0 0% 100%');
      root.style.setProperty('--popover', '147 100% 33%');
      root.style.setProperty('--popover-foreground', '0 0% 100%');
      root.style.setProperty('--sidebar-background', '147 100% 37%');
      root.style.setProperty('--sidebar-foreground', '0 0% 100%');
      root.style.setProperty('--sidebar-accent', '147 100% 45%');
      root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%');
      root.style.setProperty('--muted', '147 100% 45%');
      root.style.setProperty('--muted-foreground', '0 0% 90%');
      root.style.setProperty('--border', '147 100% 50%');
      root.style.setProperty('--input', '147 100% 50%');
    } else {
      // Branco (tema original)
      root.style.setProperty('--background', '21 0% 100%');
      root.style.setProperty('--foreground', '142 45% 15%');
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '142 45% 15%');
      root.style.setProperty('--popover', '0 0% 100%');
      root.style.setProperty('--popover-foreground', '142 45% 15%');
      root.style.setProperty('--sidebar-background', '0 0% 98%');
      root.style.setProperty('--sidebar-foreground', '142 45% 15%');
      root.style.setProperty('--sidebar-accent', '142 30% 95%');
      root.style.setProperty('--sidebar-accent-foreground', '142 45% 15%');
      root.style.setProperty('--muted', '142 30% 95%');
      root.style.setProperty('--muted-foreground', '142 20% 45%');
      root.style.setProperty('--border', '142 30% 90%');
      root.style.setProperty('--input', '142 30% 90%');
    }
  };

  const setThemeColor = async (theme: ThemeColor) => {
    setThemeColorState(theme);
    applyTheme(theme);

    if (user) {
      await supabase
        .from('profiles')
        .update({ theme_color: theme })
        .eq('id', user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
