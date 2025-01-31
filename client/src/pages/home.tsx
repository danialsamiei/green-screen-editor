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
            با سردار دل‌ها یادگاری بگیر
          </h1>
          <p className="text-muted-foreground mt-2">
            ساخت تصاویر ترکیبی با هوش مصنوعی و حذف پس‌زمینه سبز
          </p>
          <div className="mt-6 text-right bg-background/50 p-4 rounded-lg">
            <h3 className="font-bold mb-2">راهنمای گام به گام:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>تصویر شخص اول را با پس‌زمینه سبز آپلود کنید</li>
              <li>تصویر شخص دوم را با پس‌زمینه سبز آپلود کنید</li>
              <li>یک تصویر پس‌زمینه دلخواه آپلود کنید</li>
              <li>با ابزار انتخاب رنگ، رنگ‌های سبز را انتخاب کنید</li>
              <li>دکمه پردازش تصاویر را بزنید</li>
              <li>پس از پردازش می‌توانید موقعیت و اندازه اشخاص را تغییر دهید</li>
            </ol>
          </div>
        </div>

        <Card className="p-6 backdrop-blur-sm bg-background/80">
          <ImageWorkspace />
        </Card>
      </div>
    </div>
  );
}
