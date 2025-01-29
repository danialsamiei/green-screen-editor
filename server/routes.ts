import type { Express } from "express";
import { createServer, type Server } from "http";
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

        // Process background image first
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Helper function to process person image and remove green screen
        const removeGreenScreen = async (buffer: Buffer) => {
          const { data, info } = await sharp(buffer)
            .resize(TARGET_WIDTH, TARGET_HEIGHT, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .raw()
            .toBuffer({ resolveWithObject: true });

          const rgba = new Uint8Array(info.width * info.height * 4);
          const pixels = new Uint8Array(data);

          for (let i = 0; i < pixels.length; i += 3) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const outIdx = (i / 3) * 4;

            // More precise green screen detection with refined thresholds
            const isGreen = 
              g > 80 && // Lower green threshold to catch more shades of green
              g > (r * 1.3) && // Slightly more aggressive red ratio
              g > (b * 1.3) && // Slightly more aggressive blue ratio
              Math.abs(g - r) > 30 && // Ensure significant difference from red
              Math.abs(g - b) > 30;    // Ensure significant difference from blue

            if (isGreen) {
              rgba[outIdx] = 0;     // R
              rgba[outIdx + 1] = 0; // G
              rgba[outIdx + 2] = 0; // B
              rgba[outIdx + 3] = 0; // A (transparent)
            } else {
              rgba[outIdx] = r;     // R
              rgba[outIdx + 1] = g; // G
              rgba[outIdx + 2] = b; // B
              rgba[outIdx + 3] = 255; // A (fully opaque)
            }
          }

          return sharp(rgba, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 4
            }
          })
          .png()
          .toBuffer();
        };

        // Process both person images
        const person1Png = await removeGreenScreen(files.person1[0].buffer);
        const person2Png = await removeGreenScreen(files.person2[0].buffer);

        // Create final composite in the correct layer order:
        // 1. Background (bottom)
        // 2. Person 2 (middle)
        // 3. Person 1 (top)
        const composite = await sharp(background)
          .composite([
            {
              input: person2Png,
              gravity: 'center',
            },
            {
              input: person1Png,
              gravity: 'center',
            }
          ])
          .jpeg({ quality: 95 })
          .toBuffer();

        res.type("image/jpeg").send(composite);
      } catch (error) {
        console.error("Image processing error:", error);
        res.status(500).send("Failed to process images");
      }
    }
  );

  const httpServer = createServer(app);
  return httpServer;
}