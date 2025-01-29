import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Upload, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  onImageSelect: (file: File, settings: GreenScreenSettings) => void;
  label: string;
}

export interface GreenScreenSettings {
  hueMin: number;
  hueMax: number;
  saturationMin: number;
  valueMin: number;
  greenMultiplier: number;
}

export default function ImageUploader({ onImageSelect, label }: ImageUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<GreenScreenSettings>({
    hueMin: 100,
    hueMax: 160,
    saturationMin: 40,
    valueMin: 35,
    greenMultiplier: 1.4
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      onImageSelect(acceptedFiles[0], settings);
    }
  }, [onImageSelect, settings]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-2">
      <Card
        {...getRootProps()}
        className={`
          p-4 border-2 border-dashed cursor-pointer
          hover:border-primary/50 transition-colors
          ${isDragActive ? 'border-primary' : 'border-muted'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Upload className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </Card>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex justify-between items-center">
            <span>Green Screen Settings</span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Hue Range (Green)</label>
            <div className="flex gap-4">
              <Slider
                min={0}
                max={180}
                step={1}
                value={[settings.hueMin, settings.hueMax]}
                onValueChange={([min, max]) => 
                  setSettings(prev => ({ ...prev, hueMin: min, hueMax: max }))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">
                {settings.hueMin}° - {settings.hueMax}°
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Saturation</label>
            <div className="flex gap-4">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[settings.saturationMin]}
                onValueChange={([value]) => 
                  setSettings(prev => ({ ...prev, saturationMin: value }))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">
                {settings.saturationMin}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Brightness</label>
            <div className="flex gap-4">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[settings.valueMin]}
                onValueChange={([value]) => 
                  setSettings(prev => ({ ...prev, valueMin: value }))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">
                {settings.valueMin}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Green Channel Multiplier</label>
            <div className="flex gap-4">
              <Slider
                min={1}
                max={2}
                step={0.1}
                value={[settings.greenMultiplier]}
                onValueChange={([value]) => 
                  setSettings(prev => ({ ...prev, greenMultiplier: value }))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">
                {settings.greenMultiplier}x
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}