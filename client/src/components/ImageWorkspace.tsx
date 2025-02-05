import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ImageUploader, { GreenScreenSettings } from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import { Download } from "lucide-react";

interface ImageWithSettings {
  file: File;
  settings?: GreenScreenSettings;
}

export default function ImageWorkspace() {
  const { toast } = useToast();
  const [person1Image, setPerson1Image] = useState<ImageWithSettings | null>(null);
  const [person2Image, setPerson2Image] = useState<ImageWithSettings | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [person1Scale, setPerson1Scale] = useState(100);
  const [person2Scale, setPerson2Scale] = useState(100);
  const [person1Position, setPerson1Position] = useState({ x: 0, y: 0 });
  const [person2Position, setPerson2Position] = useState({ x: 0, y: 0 });

  const processImagesMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();

      if (person1Image) {
        formData.append('person1', person1Image.file);
        formData.append('person1Scale', person1Scale.toString());
        formData.append('person1Position', JSON.stringify(person1Position));
        if (person1Image.settings) {
          formData.append('person1Settings', JSON.stringify(person1Image.settings));
        }
      }

      if (person2Image) {
        formData.append('person2', person2Image.file);
        formData.append('person2Scale', person2Scale.toString());
        formData.append('person2Position', JSON.stringify(person2Position));
        if (person2Image.settings) {
          formData.append('person2Settings', JSON.stringify(person2Image.settings));
        }
      }

      if (backgroundImage) {
        formData.append('background', backgroundImage);
      }

      // Make sure to use the full URL including protocol and host
      const apiUrl = `${window.location.protocol}//${window.location.host}/api/process-images`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process images');
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    onSuccess: (imageUrl) => {
      setFinalImage(imageUrl);
      toast({
        title: "موفقیت‌آمیز!",
        description: "تصویر ترکیبی شما ایجاد شد.",
      });
    },
    onError: () => {
      toast({
        title: "خطا",
        description: "در پردازش تصاویر خطایی رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    },
  });

  const canProcess = person1Image && person2Image && backgroundImage;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImageUploader
          label="تصویر شخص اول (پرده سبز)"
          onImageSelect={(file, settings) => setPerson1Image({ file, settings })}
        />
        <ImageUploader
          label="آپلود تصویر شخص دوم (پرده سبز)"
          onImageSelect={(file, settings) => setPerson2Image({ file, settings })}
        />
        <ImageUploader
          label="آپلود تصویر پس‌زمینه"
          onImageSelect={(file) => setBackgroundImage(file)}
          isBackground
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">تصاویر ورودی</h3>
          <div className="grid grid-cols-3 gap-2">
            <ImagePreview
              image={person1Image ? URL.createObjectURL(person1Image.file) : null}
              label="شخص اول"
            />
            <ImagePreview
              image={person2Image ? URL.createObjectURL(person2Image.file) : null}
              label="شخص دوم"
            />
            <ImagePreview
              image={backgroundImage ? URL.createObjectURL(backgroundImage) : null}
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