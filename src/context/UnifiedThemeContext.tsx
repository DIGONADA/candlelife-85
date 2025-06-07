
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

type Theme = "light" | "dark" | "system" | "cyberpunk" | "dracula" | "nord" | "purple" | "green" | "ocean" | "sunset" | "forest" | "coffee" | "pastel" | "neon" | "vintage" | "midnight" | "royal" | "super-hacker";

interface UnifiedThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  isUpdating: boolean;
  appliedTheme: Theme;
}

const UnifiedThemeContext = createContext<UnifiedThemeContextType>({
  theme: "light",
  setTheme: async () => {},
  isUpdating: false,
  appliedTheme: "light",
});

export const useUnifiedTheme = () => {
  const context = useContext(UnifiedThemeContext);
  if (context === undefined) {
    throw new Error("useUnifiedTheme must be used within a UnifiedThemeProvider");
  }
  return context;
};

export const UnifiedThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "light"
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [appliedTheme, setAppliedTheme] = useState<Theme>(theme);

  // Load user's theme preference from Supabase when signed in
  useEffect(() => {
    const loadUserTheme = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_themes')
            .select('theme_name')
            .eq('user_id', user.id)
            .single();
          
          if (error && error.code !== 'PGRST116') {
            console.error("Error loading user theme:", error);
            return;
          }
          
          if (data && data.theme_name) {
            const userTheme = data.theme_name as Theme;
            setThemeState(userTheme);
            localStorage.setItem("theme", userTheme);
          }
        } catch (error) {
          console.error("Error loading user theme:", error);
        }
      }
    };

    loadUserTheme();
  }, [user]);

  // Resolve system theme
  const resolveTheme = useCallback((currentTheme: Theme): Theme => {
    if (currentTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return currentTheme;
  }, []);

  // Apply theme to document
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setAppliedTheme(resolved);
    
    // Remove all existing theme classes
    document.documentElement.className = document.documentElement.className
      .replace(/\bdark\b/g, '')
      .replace(/\blight\b/g, '')
      .trim();
    
    // Set the data-theme attribute for custom themes
    document.documentElement.setAttribute("data-theme", resolved);
    
    // Handle basic light/dark mode for compatibility
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else if (resolved === "light") {
      document.documentElement.classList.add("light");
    }
  }, [theme, resolveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const resolved = resolveTheme(theme);
        setAppliedTheme(resolved);
        
        // Remove all existing theme classes
        document.documentElement.className = document.documentElement.className
          .replace(/\bdark\b/g, '')
          .replace(/\blight\b/g, '')
          .trim();
        
        document.documentElement.setAttribute("data-theme", resolved);
        
        if (resolved === "dark") {
          document.documentElement.classList.add("dark");
        } else if (resolved === "light") {
          document.documentElement.classList.add("light");
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, resolveTheme]);

  // Update theme
  const setTheme = useCallback(async (newTheme: Theme) => {
    setIsUpdating(true);
    
    try {
      setThemeState(newTheme);
      localStorage.setItem("theme", newTheme);
      
      // If user is authenticated, save their preference to their profile
      if (user) {
        // Use upsert to insert or update the theme preference
        const { error } = await supabase
          .from('user_themes')
          .upsert({
            user_id: user.id,
            theme_name: newTheme,
            updated_at: new Date().toISOString()
          });
          
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving theme preference:", error);
    } finally {
      setIsUpdating(false);
    }
  }, [user]);

  return (
    <UnifiedThemeContext.Provider value={{ theme, setTheme, isUpdating, appliedTheme }}>
      {children}
    </UnifiedThemeContext.Provider>
  );
};
