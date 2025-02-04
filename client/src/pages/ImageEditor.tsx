import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Position {
  x: number;
  y: number;
}

interface ProcessedImage {
  url: string;
  settings: {
    selectedColors: Array<{ r: number; g: number; b: number }>;
  };
  scale: number;
  position: Position;
}

export default function ImageEditor() {
  const [person1, setPerson1] = useState<ProcessedImage | null>(null);
  const [person2, setPerson2] = useState<ProcessedImage | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  const [finalImage, setFinalImage] = useState<string | null>(null);
  
  const { getRootProps: getPerson1Props, getInputProps: getPerson1Input } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: async (files) => {
      const url = URL.createObjectURL(files[0]);
      setPerson1({
        url,
        settings: {
          selectedColors: [{ r: 0, g: 255, b: 0 }] // Default green
        },
        scale: 100,
        position: { x: 0, y: 0 }
      });
    }
  });

  const { getRootProps: getPerson2Props, getInputProps: getPerson2Input } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: async (files) => {
      const url = URL.createObjectURL(files[0]);
      setPerson2({
        url,
        settings: {
          selectedColors: [{ r: 0, g: 255, b: 0 }] // Default green
        },
        scale: 100,
        position: { x: 0, y: 0 }
      });
    }
  });

  const { getRootProps: getBackgroundProps, getInputProps: getBackgroundInput } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: async (files) => {
      const url = URL.createObjectURL(files[0]);
      setBackground(url);
    }
  });

  const processImages = async () => {
    if (!person1?.url || !person2?.url || !background) return;

    const formData = new FormData();
    
    // Convert data URLs back to blobs
    const person1Response = await fetch(person1.url);
    const person2Response = await fetch(person2.url);
    const backgroundResponse = await fetch(background);
    
    formData.append('person1', await person1Response.blob());
    formData.append('person2', await person2Response.blob());
    formData.append('background', await backgroundResponse.blob());
    
    // Add settings
    formData.append('person1Settings', JSON.stringify(person1.settings));
    formData.append('person2Settings', JSON.stringify(person2.settings));
    formData.append('person1Scale', person1.scale.toString());
    formData.append('person2Scale', person2.scale.toString());
    formData.append('person1Position', JSON.stringify(person1.position));
    formData.append('person2Position', JSON.stringify(person2.position));

    try {
      const response = await fetch('/api/process-images', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        setFinalImage(URL.createObjectURL(blob));
      }
    } catch (error) {
      console.error('Error processing images:', error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">گرین اسکرین ادیتور</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>تصویر شخص اول</CardTitle>
            <CardDescription>تصویر با پس زمینه سبز</CardDescription>
          </CardHeader>
          <CardContent>
            <div {...getPerson1Props()} className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer">
              <input {...getPerson1Input()} />
              {person1?.url ? (
                <img src={person1.url} alt="Person 1" className="max-w-full h-auto" />
              ) : (
                <p>برای آپلود کلیک کنید یا فایل را اینجا رها کنید</p>
              )}
            </div>
            {person1 && (
              <div className="mt-4">
                <label className="block mb-2">مقیاس</label>
                <Slider
                  value={[person1.scale]}
                  onValueChange={(value) => setPerson1({
                    ...person1,
                    scale: value[0]
                  })}
                  max={200}
                  step={1}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تصویر شخص دوم</CardTitle>
            <CardDescription>تصویر با پس زمینه سبز</CardDescription>
          </CardHeader>
          <CardContent>
            <div {...getPerson2Props()} className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer">
              <input {...getPerson2Input()} />
              {person2?.url ? (
                <img src={person2.url} alt="Person 2" className="max-w-full h-auto" />
              ) : (
                <p>برای آپلود کلیک کنید یا فایل را اینجا رها کنید</p>
              )}
            </div>
            {person2 && (
              <div className="mt-4">
                <label className="block mb-2">مقیاس</label>
                <Slider
                  value={[person2.scale]}
                  onValueChange={(value) => setPerson2({
                    ...person2,
                    scale: value[0]
                  })}
                  max={200}
                  step={1}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تصویر پس زمینه</CardTitle>
            <CardDescription>تصویر پس زمینه نهایی</CardDescription>
          </CardHeader>
          <CardContent>
            <div {...getBackgroundProps()} className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer">
              <input {...getBackgroundInput()} />
              {background ? (
                <img src={background} alt="Background" className="max-w-full h-auto" />
              ) : (
                <p>برای آپلود کلیک کنید یا فایل را اینجا رها کنید</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mb-6">
        <Button 
          onClick={processImages}
          disabled={!person1?.url || !person2?.url || !background}
        >
          پردازش تصاویر
        </Button>
      </div>

      {finalImage && (
        <Card>
          <CardHeader>
            <CardTitle>نتیجه نهایی</CardTitle>
          </CardHeader>
          <CardContent>
            <img src={finalImage} alt="Final Result" className="max-w-full h-auto" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
