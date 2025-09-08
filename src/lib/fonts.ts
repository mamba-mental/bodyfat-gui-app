export interface FontOption {
  name: string;
  value: string;
  category: 'serif' | 'sans-serif';
  googleFontFamily: string;
  fallback: string;
}

export const FONT_OPTIONS: FontOption[] = [
  // Sans-serif fonts
  {
    name: 'Roboto',
    value: 'roboto',
    category: 'sans-serif',
    googleFontFamily: 'Roboto:wght@300;400;500;700',
    fallback: 'system-ui, -apple-system, sans-serif'
  },
  {
    name: 'Open Sans',
    value: 'open-sans',
    category: 'sans-serif',
    googleFontFamily: 'Open+Sans:wght@300;400;600;700',
    fallback: 'system-ui, -apple-system, sans-serif'
  },
  {
    name: 'Lato',
    value: 'lato',
    category: 'sans-serif',
    googleFontFamily: 'Lato:wght@300;400;700;900',
    fallback: 'system-ui, -apple-system, sans-serif'
  },
  {
    name: 'Montserrat',
    value: 'montserrat',
    category: 'sans-serif',
    googleFontFamily: 'Montserrat:wght@300;400;500;600;700',
    fallback: 'system-ui, -apple-system, sans-serif'
  },
  {
    name: 'Poppins',
    value: 'poppins',
    category: 'sans-serif',
    googleFontFamily: 'Poppins:wght@300;400;500;600;700',
    fallback: 'system-ui, -apple-system, sans-serif'
  },
  
  // Serif fonts
  {
    name: 'Playfair Display',
    value: 'playfair-display',
    category: 'serif',
    googleFontFamily: 'Playfair+Display:wght@400;500;600;700;800;900',
    fallback: 'Georgia, serif'
  },
  {
    name: 'Lora',
    value: 'lora',
    category: 'serif',
    googleFontFamily: 'Lora:wght@400;500;600;700',
    fallback: 'Georgia, serif'
  },
  {
    name: 'Merriweather',
    value: 'merriweather',
    category: 'serif',
    googleFontFamily: 'Merriweather:wght@300;400;700;900',
    fallback: 'Georgia, serif'
  },
  {
    name: 'Crimson Text',
    value: 'crimson-text',
    category: 'serif',
    googleFontFamily: 'Crimson+Text:wght@400;600;700',
    fallback: 'Georgia, serif'
  },
  {
    name: 'Source Serif Pro',
    value: 'source-serif-pro',
    category: 'serif',
    googleFontFamily: 'Source+Serif+Pro:wght@400;600;700',
    fallback: 'Georgia, serif'
  }
];

export function getFontFamily(fontValue: string): string {
  const font = FONT_OPTIONS.find(f => f.value === fontValue);
  if (!font) return 'system-ui, -apple-system, sans-serif';
  return `'${font.name}', ${font.fallback}`;
}

export function getGoogleFontsUrl(fonts: string[]): string {
  const fontFamilies = fonts
    .map(fontValue => {
      const font = FONT_OPTIONS.find(f => f.value === fontValue);
      return font?.googleFontFamily;
    })
    .filter(Boolean)
    .join('&family=');
  
  return `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
}