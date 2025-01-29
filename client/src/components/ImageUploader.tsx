import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import ColorPicker from "./ColorPicker";

interface ImageUploaderProps {
  onImageSelect: (file: File, settings?: GreenScreenSettings) => void;
  label: string;
  isBackground?: boolean;
}

export interface GreenScreenSettings {
  selectedColors: Array<{ r: number; g: number; b: number }>;
}

export default function ImageUploader({ onImageSelect, label, isBackground }: ImageUploaderProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<GreenScreenSettings>({
    selectedColors: []
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      setUploadedImage(URL.createObjectURL(file));

      // برای تصویر پس‌زمینه، مستقیماً فایل را بدون تنظیمات ارسال می‌کنیم
      if (isBackground) {
        onImageSelect(file);
      }
    }
  }, [isBackground, onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleColorsPicked = (colors: Array<{ r: number; g: number; b: number }>) => {
    if (selectedFile && !isBackground) {
      const newSettings = { selectedColors: colors };
      setSettings(newSettings);
      onImageSelect(selectedFile, newSettings);
    }
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
      ) : !isBackground ? (
        <ColorPicker
          image={uploadedImage}
          onColorPicked={handleColorsPicked}
        />
      ) : (
        <div className="relative aspect-video">
          <img
            src={uploadedImage}
            alt={label}
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      )}
    </div>
  );
}