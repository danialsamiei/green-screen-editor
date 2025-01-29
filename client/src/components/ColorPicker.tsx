import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair } from "lucide-react";

interface ColorPickerProps {
  image: string;
  onColorPicked: (color: { r: number; g: number; b: number }) => void;
}

export default function ColorPicker({ image, onColorPicked }: ColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);

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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickingColor) return;

    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    const previewCtx = previewCanvas?.getContext("2d");

    if (!canvas || !ctx || !previewCanvas || !previewCtx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get color at clicked position
    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    const color = { r: pixel[0], g: pixel[1], b: pixel[2] };

    // Update the preview with transparent pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Define color tolerance (adjust these values to make color matching more or less strict)
    const tolerance = 30;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check if pixel color is within tolerance range of picked color
      if (
        Math.abs(r - color.r) < tolerance &&
        Math.abs(g - color.g) < tolerance &&
        Math.abs(b - color.b) < tolerance
      ) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    previewCtx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw checkerboard pattern to show transparency
    const pattern = ctx.createPattern(createCheckerboardPattern(), 'repeat');
    if (pattern) {
      previewCtx.fillStyle = pattern;
      previewCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    previewCtx.putImageData(imageData, 0, 0);

    onColorPicked(color);
    setIsPickingColor(false);
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
      <Button
        size="icon"
        variant={isPickingColor ? "secondary" : "outline"}
        className="absolute top-2 right-2 z-10"
        onClick={() => setIsPickingColor(!isPickingColor)}
      >
        <Crosshair className="h-4 w-4" />
      </Button>
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
    </div>
  );
}