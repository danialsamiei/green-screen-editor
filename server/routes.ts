import { createServer, type Server } from "http";
import type { Express } from "express";
import multer from "multer";
import sharp from "sharp";

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Standard size for processing
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

export function registerRoutes(app: Express): Server {
  app.post(
    "/api/process-images",
    upload.fields([
      { name: "person1", maxCount: 1 },
      { name: "person2", maxCount: 1 },
      { name: "background", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (!files.person1 || !files.person2 || !files.background) {
          return res.status(400).send("Missing required images");
        }

        // Process background image first - keep it opaque
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Helper function to process person image and remove only green background
        const removeGreenScreen = async (buffer: Buffer) => {
          // Process at target size first to ensure compatibility
          const resizedBuffer = await sharp(buffer)
            .resize(TARGET_WIDTH, TARGET_HEIGHT, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .toBuffer();

          const { data, info } = await sharp(resizedBuffer)
            .raw()
            .toBuffer({ resolveWithObject: true });

          const rgba = new Uint8Array(info.width * info.height * 4);
          const pixels = new Uint8Array(data);

          // More precise green screen removal that only affects background
          for (let i = 0; i < pixels.length; i += 3) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const outIdx = (i / 3) * 4;

            // Refined green screen detection that only affects pure green background
            const isGreenBackground =
              g > 180 && // High green value
              g > (r * 2) && // Much more green than red
              g > (b * 2) && // Much more green than blue
              r < 100 && // Low red value
              b < 100; // Low blue value

            if (isGreenBackground) {
              // Make only the green background transparent
              rgba[outIdx] = 0;
              rgba[outIdx + 1] = 0;
              rgba[outIdx + 2] = 0;
              rgba[outIdx + 3] = 0; // Fully transparent
            } else {
              // Keep original colors for non-background pixels
              rgba[outIdx] = r;
              rgba[outIdx + 1] = g;
              rgba[outIdx + 2] = b;
              rgba[outIdx + 3] = 255; // Fully opaque
            }
          }

          return sharp(rgba, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 4
            }
          })
            .png() // Ensure PNG output for transparency
            .toBuffer();
        };

        // Process both person images
        const person1Png = await removeGreenScreen(files.person1[0].buffer);
        const person2Png = await removeGreenScreen(files.person2[0].buffer);

        // Create final composite with precise layer ordering and positioning:
        // 1. Background (bottom)
        // 2. Person 2 on right side (middle)
        // 3. Person 1 on left side (top)
        const composite = await sharp(background)
          .composite([
            {
              input: person2Png,
              gravity: 'east', // Position person2 on the right
              top: 0,
              left: Math.floor(TARGET_WIDTH / 2) // Start from middle of the image
            },
            {
              input: person1Png,
              gravity: 'west', // Position person1 on the left
              top: 0,
              left: 0 // Start from left edge
            }
          ])
          .png()
          .toBuffer();

        res.type("image/png").send(composite);
      } catch (error) {
        console.error("Image processing error:", error);
        res.status(500).send("Failed to process images");
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}