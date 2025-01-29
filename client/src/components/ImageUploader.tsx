import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  label: string;
}

export default function ImageUploader({ onImageSelect, label }: ImageUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      onImageSelect(acceptedFiles[0]);
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  return (
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
  );
}
