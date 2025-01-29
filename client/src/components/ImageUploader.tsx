import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Upload, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import ColorPicker from "./ColorPicker";

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
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<GreenScreenSettings>({
    hueMin: 100,
    hueMax: 160,
    saturationMin: 40,
    valueMin: 35,
    greenMultiplier: 1.4
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setUploadedImage(URL.createObjectURL(file));
      onImageSelect(file, settings);
    }
  }, [onImageSelect, settings]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleColorPicked = (color: { r: number; g: number; b: number }) => {
    // تبدیل RGB به HSV و تنظیم محدوده رنگ
    const max = Math.max(color.r, color.g, color.b) / 255;
    const min = Math.min(color.r, color.g, color.b) / 255;
    const diff = max - min;

    let h = 0;
    if (diff !== 0) {
      if (max === color.g / 255) {
        h = 60 * (2 + (color.b / 255 - color.r / 255) / diff);
      } else if (max === color.b / 255) {
        h = 60 * (4 + (color.r / 255 - color.g / 255) / diff);
      } else {
        h = 60 * ((color.g / 255 - color.b / 255) / diff);
      }
    }
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : (diff / max) * 100;
    const v = max * 100;

    // تنظیم محدوده رنگ با توجه به رنگ انتخاب شده
    setSettings(prev => ({
      ...prev,
      hueMin: Math.max(0, h - 20),
      hueMax: Math.min(180, h + 20),
      saturationMin: Math.max(0, s - 20),
      valueMin: Math.max(0, v - 20),
      greenMultiplier: color.g / Math.max(color.r, color.b, 1)
    }));
  };

  return (
    <div className="space-y-2">
      {!uploadedImage ? (
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
      ) : (
        <ColorPicker
          image={uploadedImage}
          onColorPicked={handleColorPicked}
        />
      )}

      <div className="space-y-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium">محدوده رنگ سبز</label>
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
          <label className="text-sm font-medium">حداقل اشباع رنگ</label>
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
          <label className="text-sm font-medium">حداقل روشنایی</label>
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
          <label className="text-sm font-medium">ضریب کانال سبز</label>
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
      </div>
    </div>
  );
}