
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Moon, Sun, Palette, Zap, Ghost, Mountain, Coffee, 
  PaintBucket, Sunset, Leaf, Waves, Sparkles, Clock, 
  Crown, Terminal, Monitor
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedTheme } from "@/context/UnifiedThemeContext";

// Group themes by category for better organization
const themeCategories = [
  {
    name: "Básicos",
    themes: [
      { id: "light", name: "Claro", icon: Sun },
      { id: "dark", name: "Escuro", icon: Moon },
      { id: "system", name: "Sistema", icon: Monitor },
    ]
  },
  {
    name: "Coloridos",
    themes: [
      { id: "cyberpunk", name: "Cyberpunk", icon: Zap },
      { id: "dracula", name: "Dracula", icon: Ghost },
      { id: "nord", name: "Nord", icon: Mountain },
      { id: "purple", name: "Roxo", icon: PaintBucket },
      { id: "green", name: "Verde", icon: Leaf },
      { id: "ocean", name: "Oceano", icon: Waves },
    ]
  },
  {
    name: "Especiais",
    themes: [
      { id: "sunset", name: "Pôr do Sol", icon: Sunset },
      { id: "forest", name: "Floresta", icon: Leaf },
      { id: "coffee", name: "Café", icon: Coffee },
      { id: "pastel", name: "Pastel", icon: Sparkles },
      { id: "neon", name: "Neon", icon: Zap },
      { id: "vintage", name: "Vintage", icon: Clock },
      { id: "midnight", name: "Meia-noite", icon: Moon },
      { id: "royal", name: "Real", icon: Crown },
      { id: "super-hacker", name: "Super Hacker", icon: Terminal },
    ]
  }
];

// Flatten all themes for easier reference
const allThemes = themeCategories.flatMap(category => category.themes);

export const UnifiedThemeSettings = () => {
  const { theme, setTheme, isUpdating } = useUnifiedTheme();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(theme);

  const updateTheme = async (newTheme: string) => {
    const themeName = allThemes.find(t => t.id === newTheme)?.name.toLowerCase() || newTheme;
    
    try {
      setSelectedTheme(newTheme as any);
      await setTheme(newTheme as any);
      
      toast({
        title: "Tema alterado",
        description: `O tema foi alterado para ${themeName}.`,
      });
    } catch (error) {
      console.error("Erro ao atualizar tema:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o tema.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Personalização</h2>
        <p className="text-sm text-muted-foreground">
          Escolha o tema que melhor combina com você.
        </p>
      </div>

      <div className="space-y-6">
        {themeCategories.map((category) => (
          <div key={category.name} className="space-y-3">
            <h3 className="text-base font-medium">{category.name}</h3>
            <RadioGroup
              value={selectedTheme}
              onValueChange={updateTheme}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"
              disabled={isUpdating}
            >
              {category.themes.map(({ id, name, icon: Icon }) => (
                <Label
                  key={id}
                  htmlFor={id}
                  className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer hover:bg-accent transition-colors ${
                    selectedTheme === id ? "border-primary bg-accent/50" : "border-input"
                  } ${isUpdating ? "opacity-50" : ""}`}
                >
                  <RadioGroupItem value={id} id={id} disabled={isUpdating} />
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{name}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
};
