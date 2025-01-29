import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ImageUploader from "./ImageUploader";
import ImagePreview from "./ImagePreview";
import { Download } from "lucide-react";

export default function ImageWorkspace() {
  const { toast } = useToast();
  const [person1Image, setPerson1Image] = useState<File | null>(null);
  const [person2Image, setPerson2Image] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);

  const processImagesMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (person1Image) formData.append('person1', person1Image);
      if (person2Image) formData.append('person2', person2Image);
      if (backgroundImage) formData.append('background', backgroundImage);

      const response = await fetch('/api/process-images', {
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
        title: "Success!",
        description: "Your composite image has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process images. Please try again.",
        variant: "destructive",
      });
    },
  });

  const canProcess = person1Image && person2Image && backgroundImage;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImageUploader
          label="Upload person 1 (green screen)"
          onImageSelect={(file) => setPerson1Image(file)}
        />
        <ImageUploader
          label="Upload person 2 (green screen)"
          onImageSelect={(file) => setPerson2Image(file)}
        />
        <ImageUploader
          label="Upload background image"
          onImageSelect={(file) => setBackgroundImage(file)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Input Images</h3>
          <div className="grid grid-cols-3 gap-2">
            <ImagePreview
              image={person1Image ? URL.createObjectURL(person1Image) : null}
              label="Person 1"
            />
            <ImagePreview
              image={person2Image ? URL.createObjectURL(person2Image) : null}
              label="Person 2"
            />
            <ImagePreview
              image={backgroundImage ? URL.createObjectURL(backgroundImage) : null}
              label="Background"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Final Composite</h3>
          <ImagePreview
            image={finalImage}
            isProcessing={processImagesMutation.isPending}
            label="Final composite will appear here"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          onClick={() => processImagesMutation.mutate()}
          disabled={!canProcess || processImagesMutation.isPending}
        >
          Process Images
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
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
