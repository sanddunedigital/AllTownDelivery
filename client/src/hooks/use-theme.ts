import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Convert hex color to HSL format for CSS variables
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

// Generate lighter/darker variations of a color
function adjustHslLightness(hsl: string, adjustment: number): string {
  const [h, s, l] = hsl.split(',').map(val => parseInt(val.trim().replace('%', '')));
  const newL = Math.max(0, Math.min(100, l + adjustment));
  return `${h}, ${s}%, ${newL}%`;
}

interface BusinessSettings {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  [key: string]: any;
}

export function useTheme() {
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
  }) as { data: BusinessSettings | undefined };

  useEffect(() => {
    if (businessSettings) {
      const root = document.documentElement;
      
      // Convert colors to HSL
      const primaryHsl = hexToHsl(businessSettings.primaryColor || '#0369a1');
      const secondaryHsl = hexToHsl(businessSettings.secondaryColor || '#64748b');
      const accentHsl = hexToHsl(businessSettings.accentColor || '#ea580c');

      // Set primary color variations
      root.style.setProperty('--primary', `hsl(${primaryHsl})`);
      root.style.setProperty('--primary-foreground', 'hsl(0, 0%, 100%)');
      
      // Set secondary color variations
      root.style.setProperty('--secondary', `hsl(${secondaryHsl})`);
      root.style.setProperty('--secondary-foreground', 'hsl(0, 0%, 0%)');
      
      // Set accent color variations
      root.style.setProperty('--accent', `hsl(${accentHsl})`);
      root.style.setProperty('--accent-foreground', 'hsl(0, 0%, 100%)');

      // Generate additional color variations for better theming
      root.style.setProperty('--primary-50', `hsl(${adjustHslLightness(primaryHsl, 45)})`);
      root.style.setProperty('--primary-100', `hsl(${adjustHslLightness(primaryHsl, 35)})`);
      root.style.setProperty('--primary-200', `hsl(${adjustHslLightness(primaryHsl, 25)})`);
      root.style.setProperty('--primary-500', `hsl(${primaryHsl})`);
      root.style.setProperty('--primary-600', `hsl(${adjustHslLightness(primaryHsl, -10)})`);
      root.style.setProperty('--primary-700', `hsl(${adjustHslLightness(primaryHsl, -20)})`);

      root.style.setProperty('--accent-50', `hsl(${adjustHslLightness(accentHsl, 45)})`);
      root.style.setProperty('--accent-100', `hsl(${adjustHslLightness(accentHsl, 35)})`);
      root.style.setProperty('--accent-200', `hsl(${adjustHslLightness(accentHsl, 25)})`);
      root.style.setProperty('--accent-500', `hsl(${accentHsl})`);
      root.style.setProperty('--accent-600', `hsl(${adjustHslLightness(accentHsl, -10)})`);
      root.style.setProperty('--accent-700', `hsl(${adjustHslLightness(accentHsl, -20)})`);

      // Replace hardcoded orange colors with dynamic accent colors
      root.style.setProperty('--orange-50', `hsl(${adjustHslLightness(accentHsl, 45)})`);
      root.style.setProperty('--orange-100', `hsl(${adjustHslLightness(accentHsl, 35)})`);
      root.style.setProperty('--orange-500', `hsl(${accentHsl})`);
      root.style.setProperty('--orange-600', `hsl(${adjustHslLightness(accentHsl, -10)})`);
    }
  }, [businessSettings]);

  return businessSettings;
}