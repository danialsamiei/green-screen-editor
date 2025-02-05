import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ImageUploader, { GreenScreenSettings } from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import { Download } from "lucide-react";

interface ImageWithSettings {
  file: File;
  settings?: GreenScreenSettings;
  previewUrl?: string;
}

export default function ImageWorkspace() {
  const { toast } = useToast();
  const [person1Image, setPerson1Image] = useState<ImageWithSettings | null>(null);
  const [person2Image, setPerson2Image] = useState<ImageWithSettings | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [person1Scale, setPerson1Scale] = useState(100);
  const [person2Scale, setPerson2Scale] = useState(100);
  const [person1Position, setPerson1Position] = useState({ x: 0, y: 0 });
  const [person2Position, setPerson2Position] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Cleanup URLs when component unmounts
    return () => {
      if (person1Image?.previewUrl) URL.revokeObjectURL(person1Image.previewUrl);
      if (person2Image?.previewUrl) URL.revokeObjectURL(person2Image.previewUrl);
      if (backgroundPreviewUrl) URL.revokeObjectURL(backgroundPreviewUrl);
      if (finalImage) URL.revokeObjectURL(finalImage);
    };
  }, []);

  const processImagesMutation = useMutation({
    mutationFn: async () => {
      if (!person1Image || !person2Image || !backgroundImage) {
        throw new Error('All images are required');
      }

      const formData = new FormData();

      // Add images
      formData.append('person1', person1Image.file);
      formData.append('person2', person2Image.file);
      formData.append('background', backgroundImage);

      // Add settings
      if (person1Image.settings) {
        formData.append('person1Settings', JSON.stringify(person1Image.settings));
      }
      if (person2Image.settings) {
        formData.append('person2Settings', JSON.stringify(person2Image.settings));
      }

      // Add scale and position
      formData.append('person1Scale', person1Scale.toString());
      formData.append('person2Scale', person2Scale.toString());
      formData.append('person1Position', JSON.stringify(person1Position));
      formData.append('person2Position', JSON.stringify(person2Position));

      try {
        // Make sure to use the full URL including protocol and host
        const apiUrl = `${window.location.protocol}//${window.location.host}/api/process-images`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error processing images:', error);
        throw error;
      }
    },
    onSuccess: (imageUrl) => {
      if (finalImage) URL.revokeObjectURL(finalImage);
      setFinalImage(imageUrl);
      toast({
        title: "موفقیت‌آمیز!",
        description: "تصویر ترکیبی شما ایجاد شد.",
      });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast({
        title: "خطا",
        description: "در پردازش تصاویر خطایی رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  const handlePerson1Select = (file: File, settings?: GreenScreenSettings) => {
    if (person1Image?.previewUrl) URL.revokeObjectURL(person1Image.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setPerson1Image({ file, settings, previewUrl });
  };

  const handlePerson2Select = (file: File, settings?: GreenScreenSettings) => {
    if (person2Image?.previewUrl) URL.revokeObjectURL(person2Image.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setPerson2Image({ file, settings, previewUrl });
  };

  const handleBackgroundSelect = (file: File) => {
    if (backgroundPreviewUrl) URL.revokeObjectURL(backgroundPreviewUrl);
    setBackgroundImage(file);
    setBackgroundPreviewUrl(URL.createObjectURL(file));
  };

  const canProcess = person1Image && person2Image && backgroundImage;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImageUploader
          label="تصویر شخص اول (پرده سبز)"
          onImageSelect={handlePerson1Select}
        />
        <ImageUploader
          label="آپلود تصویر شخص دوم (پرده سبز)"
          onImageSelect={handlePerson2Select}
        />
        <ImageUploader
          label="آپلود تصویر پس‌زمینه"
          onImageSelect={handleBackgroundSelect}
          isBackground
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">تصاویر ورودی</h3>
          <div className="grid grid-cols-3 gap-2">
            <ImagePreview
              image={person1Image?.previewUrl || null}
              label="شخص اول"
            />
            <ImagePreview
              image={person2Image?.previewUrl || null}
              label="شخص دوم"
            />
            <ImagePreview
              image={backgroundPreviewUrl}
              label="پس‌زمینه"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">تصویر نهایی</h3>
          <ImagePreview
            image={finalImage}
            isProcessing={processImagesMutation.isPending}
            label="تصویر نهایی"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          onClick={() => processImagesMutation.mutate()}
          disabled={!canProcess || processImagesMutation.isPending}
        >
          {processImagesMutation.isPending ? "در حال پردازش..." : "پردازش تصاویر"}
        </Button>
        {finalImage && (
          <Button
            variant="secondary"
            onClick={() => {
              const link = document.createElement('a');
              link.href = finalImage;
              link.download = 'composite.png';
              link.click();
            }}
          >
            <Download className="w-4 h-4 ml-2" />
            دانلود
          </Button>
        )}
      </div>
    </div>
  );
}