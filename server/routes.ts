import { createServer, type Server } from "http";
import type { Express } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Standard size for processing
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const SPACING_PERCENT = 5; // 5% spacing between images

interface GreenScreenSettings {
  selectedColors: Array<{ r: number; g: number; b: number }>;
}

export function registerRoutes(app: Express): Server {
  // Handle image processing endpoint
  app.post(
    "/api/process-images",
    upload.fields([
      { name: "person1", maxCount: 1 },
      { name: "person2", maxCount: 1 },
      { name: "background", maxCount: 1 },
    ]),
    async (req, res) => {
      console.log("Processing request started");
      try {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (!files.person1?.[0] || !files.person2?.[0] || !files.background?.[0]) {
          console.error("Missing required files", {
            person1: !!files.person1,
            person2: !!files.person2,
            background: !!files.background
          });
          return res.status(400).json({ error: "Missing required images" });
        }

        // Parse settings from request body
        const person1Settings: GreenScreenSettings = req.body.person1Settings ?
          JSON.parse(req.body.person1Settings) : { selectedColors: [{ r: 0, g: 255, b: 0 }] };
        const person2Settings: GreenScreenSettings = req.body.person2Settings ?
          JSON.parse(req.body.person2Settings) : { selectedColors: [{ r: 0, g: 255, b: 0 }] };

        console.log("Processing background image");
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        console.log("Processing person images");
        const person1Result = await processPersonImage(files.person1[0].buffer, person1Settings);
        const person2Result = await processPersonImage(files.person2[0].buffer, person2Settings);

        const spacing = Math.floor(TARGET_WIDTH * (SPACING_PERCENT / 100));
        const totalWidth = person1Result.bounds.width + person2Result.bounds.width + spacing;
        const startX = Math.floor((TARGET_WIDTH - totalWidth) / 2);

        console.log("Creating final composite");
        const composite = await sharp(background)
          .composite([
            {
              input: person1Result.buffer,
              top: 0,
              left: startX
            },
            {
              input: person2Result.buffer,
              top: 0,
              left: startX + person1Result.bounds.width + spacing
            }
          ])
          .png()
          .toBuffer();

        console.log("Sending response");
        res.type("image/png").send(composite);
      } catch (error) {
        console.error("Image processing error:", error);
        res.status(500).json({ error: "Failed to process images" });
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to process person image
async function processPersonImage(buffer: Buffer, settings: GreenScreenSettings) {
  // Resize image first
  const resizedImage = await sharp(buffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .toBuffer();

  // Convert to raw pixels for processing
  const { data, info } = await sharp(resizedImage)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const rgba = new Uint8Array(info.width * info.height * 4);

  // Define color tolerance
  const tolerance = 30;

  // Process each pixel
  for (let i = 0; i < pixels.length; i += 3) {
    const outIdx = (i / 3) * 4;
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // Check if pixel color matches any of the selected colors
    const shouldBeTransparent = settings.selectedColors.some(color =>
      Math.abs(r - color.r) < tolerance &&
      Math.abs(g - color.g) < tolerance &&
      Math.abs(b - color.b) < tolerance
    );

    if (shouldBeTransparent) {
      // Make pixel transparent
      rgba[outIdx] = 0;
      rgba[outIdx + 1] = 0;
      rgba[outIdx + 2] = 0;
      rgba[outIdx + 3] = 0;
    } else {
      // Keep original colors
      rgba[outIdx] = r;
      rgba[outIdx + 1] = g;
      rgba[outIdx + 2] = b;
      rgba[outIdx + 3] = 255;
    }
  }

  // Convert back to PNG with transparency
  const processedImage = await sharp(rgba, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png()
    .toBuffer();

  return {
    buffer: processedImage,
    bounds: {
      width: info.width,
      height: info.height
    }
  };
}