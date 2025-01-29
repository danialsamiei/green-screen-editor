import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, Undo } from "lucide-react";

interface ColorPickerProps {
  image: string;
  onColorPicked: (colors: Array<{ r: number; g: number; b: number }>) => void;
}

export default function ColorPicker({ image, onColorPicked }: ColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [selectedColors, setSelectedColors] = useState<Array<{ r: number; g: number; b: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const previewCtx = previewCanvas?.getContext("2d");

    if (!canvas || !ctx || !previewCanvas || !previewCtx) return;

    const img = new Image();
    img.src = image;
    img.onload = () => {
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      previewCanvas.width = img.width;
      previewCanvas.height = img.height;

      // Draw original image on both canvases
      ctx.drawImage(img, 0, 0);
      previewCtx.drawImage(img, 0, 0);
    };
  }, [image]);

  const updatePreview = () => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const previewCtx = previewCanvas?.getContext("2d");

    if (!canvas || !ctx || !previewCanvas || !previewCtx) return;

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Define color tolerance
    const tolerance = 30;

    // Reset the preview
    previewCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw checkerboard pattern
    const pattern = ctx.createPattern(createCheckerboardPattern(), 'repeat');
    if (pattern) {
      previewCtx.fillStyle = pattern;
      previewCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply all selected colors
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check if pixel matches any selected color
      const shouldBeTransparent = selectedColors.some(color => 
        Math.abs(r - color.r) < tolerance &&
        Math.abs(g - color.g) < tolerance &&
        Math.abs(b - color.b) < tolerance
      );

      if (shouldBeTransparent) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    previewCtx.putImageData(imageData, 0, 0);
    onColorPicked(selectedColors);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickingColor) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get color at clicked position
    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    const newColor = { r: pixel[0], g: pixel[1], b: pixel[2] };

    // Add new color to selected colors
    setSelectedColors(prev => [...prev, newColor]);
    updatePreview();
  };

  const handleUndo = () => {
    if (selectedColors.length > 0) {
      setSelectedColors(prev => {
        const newColors = prev.slice(0, -1);
        setTimeout(() => {
          onColorPicked(newColors);
          updatePreview();
        }, 0);
        return newColors;
      });
    }
  };

  // Create checkerboard pattern for transparency visualization
  const createCheckerboardPattern = () => {
    const patternCanvas = document.createElement('canvas');
    const patternCtx = patternCanvas.getContext('2d');
    if (!patternCtx) return patternCanvas;

    patternCanvas.width = 16;
    patternCanvas.height = 16;

    patternCtx.fillStyle = '#ffffff';
    patternCtx.fillRect(0, 0, 8, 8);
    patternCtx.fillRect(8, 8, 8, 8);
    patternCtx.fillStyle = '#e0e0e0';
    patternCtx.fillRect(0, 8, 8, 8);
    patternCtx.fillRect(8, 0, 8, 8);

    return patternCanvas;
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          size="icon"
          variant={isPickingColor ? "secondary" : "outline"}
          onClick={() => setIsPickingColor(!isPickingColor)}
        >
          <Crosshair className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={handleUndo}
          disabled={selectedColors.length === 0}
        >
          <Undo className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <p className="text-sm text-muted-foreground mb-2">تصویر اصلی</p>
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`w-full h-full cursor-${isPickingColor ? 'crosshair' : 'default'}`}
          />
        </div>
        <div className="relative">
          <p className="text-sm text-muted-foreground mb-2">پیش‌نمایش</p>
          <canvas
            ref={previewCanvasRef}
            className="w-full h-full"
          />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-muted-foreground">
          تعداد رنگ‌های انتخاب شده: {selectedColors.length}
        </p>
      </div>
    </div>
  );
}