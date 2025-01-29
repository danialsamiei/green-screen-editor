import { Card } from "@/components/ui/card";
import CircuitBackground from "@/components/CircuitBackground";
import ImageWorkspace from "@/components/ImageWorkspace";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      <CircuitBackground />
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            AI Image Compositor
          </h1>
          <p className="text-muted-foreground mt-2">
            Create stunning composite images with AI-powered green screen removal
          </p>
        </div>

        <Card className="p-6 backdrop-blur-sm bg-background/80">
          <ImageWorkspace />
        </Card>
      </div>
    </div>
  );
}
