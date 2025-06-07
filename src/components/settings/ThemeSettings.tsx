
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Moon, Sun, Monitor
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";

// Group themes by category for better organization
const themeCategories = [
  {
    name: "Básico",
    themes: [
      { id: "light", name: "Claro", icon: Sun },
      { id: "dark", name: "Escuro", icon: Moon },
      { id: "system", name: "Sistema", icon: Monitor },
    ]
  }
];

// Flatten all themes for easier reference
const allThemes = themeCategories.flatMap(category => category.themes);

export const ThemeSettings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateTheme = async (newTheme: string) => {
    const themeName = allThemes.find(t => t.id === newTheme)?.name.toLowerCase() || newTheme;
    
    try {
      setIsUpdating(true);
      setSelectedTheme(newTheme as any);
      setTheme(newTheme as any);
      
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
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Personalização</h2>
        <p className="text-sm text-muted-foreground">
          Escolha o tema que melhor combina com você.
        </p>
      </div>

      <div className="space-y-4">
        {themeCategories.map((category) => (
          <div key={category.name} className="space-y-2">
            <h3 className="text-base font-medium">{category.name}</h3>
            <RadioGroup
              value={selectedTheme}
              onValueChange={updateTheme}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
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
                  <span className="text-sm">{name}</span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
};
