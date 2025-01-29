import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair } from "lucide-react";

interface ColorPickerProps {
  image: string;
  onColorPicked: (color: { r: number; g: number; b: number }) => void;
}

export default function ColorPicker({ image, onColorPicked }: ColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPickingColor, setIsPickingColor] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = image;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
  }, [image]);

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

    const pixel = ctx.getImageData(x * scaleX, y * scaleY, 1, 1).data;
    onColorPicked({ r: pixel[0], g: pixel[1], b: pixel[2] });
    setIsPickingColor(false);
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
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`w-full h-full cursor-${isPickingColor ? 'crosshair' : 'default'}`}
      />
    </div>
  );
}