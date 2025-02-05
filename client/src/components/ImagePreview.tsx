import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ImagePreviewProps {
  image: string | null;
  isProcessing?: boolean;
  label: string;
}

export default function ImagePreview({ image, isProcessing, label }: ImagePreviewProps) {
  return (
    <Card className="p-2">
      <div className="aspect-video relative overflow-hidden rounded-sm">
        {isProcessing ? (
          <Skeleton className="w-full h-full" />
        ) : image ? (
          <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
            <img
              src={image}
              alt={label}
              className="max-w-full max-h-full object-contain"
              style={{
                imageRendering: 'pixelated'
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        )}
      </div>
    </Card>
  );
}