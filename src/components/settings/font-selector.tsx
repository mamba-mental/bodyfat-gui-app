"use client"

import React, { useEffect, useState } from 'react'
import { useMountedRef } from '@/hooks/use-mounted-ref'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { FONT_OPTIONS, getFontFamily, getGoogleFontsUrl } from '@/lib/fonts'
import { cn } from '@/lib/utils'

interface FontSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const mountedRef = useMountedRef();

  // Load Google Fonts dynamically
  useEffect(() => {
    const fontsToLoad = FONT_OPTIONS.filter(font => !loadedFonts.has(font.value));

    if (fontsToLoad.length === 0) return;

    const link = document.createElement('link');
    link.href = getGoogleFontsUrl(fontsToLoad.map(f => f.value));
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    link.onload = () => {
      if (mountedRef.current) {
        setLoadedFonts(new Set([...loadedFonts, ...fontsToLoad.map(f => f.value)]));
      }
    };

    return () => {
      // Remove link element on unmount
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, [mountedRef]);

  const sansSerifFonts = FONT_OPTIONS.filter(font => font.category === 'sans-serif');
  const serifFonts = FONT_OPTIONS.filter(font => font.category === 'serif');

  const renderFontOption = (font: typeof FONT_OPTIONS[0]) => (
    <label
      key={font.value}
      className={cn(
        "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all",
        value === font.value 
          ? "border-primary bg-primary/5" 
          : "border-muted hover:border-primary/50"
      )}
    >
      <RadioGroupItem value={font.value} className="mt-1" />
      <div className="flex-1">
        <div className="font-medium">{font.name}</div>
        <div 
          className="mt-2 text-sm text-muted-foreground"
          style={{ fontFamily: getFontFamily(font.value) }}
        >
          The quick brown fox jumps over the lazy dog
        </div>
        <div 
          className="mt-1 text-xs"
          style={{ fontFamily: getFontFamily(font.value) }}
        >
          1234567890 !@#$%^&*()
        </div>
      </div>
    </label>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Font Style</CardTitle>
        <CardDescription>
          Choose a font style for the application. Preview how text will appear before making your selection.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onChange}>
          <div className="space-y-6">
            {/* Sans-serif fonts */}
            <div>
              <h3 className="text-sm font-medium mb-3">Sans-serif Fonts</h3>
              <div className="space-y-2">
                {sansSerifFonts.map(renderFontOption)}
              </div>
            </div>

            <Separator />

            {/* Serif fonts */}
            <div>
              <h3 className="text-sm font-medium mb-3">Serif Fonts</h3>
              <div className="space-y-2">
                {serifFonts.map(renderFontOption)}
              </div>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}