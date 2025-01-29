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

        // Process background image first
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Helper function to process person image and remove green screen
        const removeGreenScreen = async (buffer: Buffer, isLeftSide: boolean) => {
          // Get original dimensions
          const metadata = await sharp(buffer).metadata();

          // Process at original size first
          const { data, info } = await sharp(buffer)
            .raw()
            .toBuffer({ resolveWithObject: true });

          const rgba = new Uint8Array(info.width * info.height * 4);
          const pixels = new Uint8Array(data);

          // More precise green screen removal
          for (let i = 0; i < pixels.length; i += 3) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const outIdx = (i / 3) * 4;

            // Enhanced green screen detection with multiple conditions
            const isGreen = 
              g > 70 && // Lowered threshold to catch more green variations
              g > (r * 1.4) && // Increased ratio for better detection
              g > (b * 1.4) &&
              Math.abs(g - r) > 40 &&
              Math.abs(g - b) > 40;

            if (isGreen) {
              rgba[outIdx] = 0;
              rgba[outIdx + 1] = 0;
              rgba[outIdx + 2] = 0;
              rgba[outIdx + 3] = 0; // Full transparency
            } else {
              rgba[outIdx] = r;
              rgba[outIdx + 1] = g;
              rgba[outIdx + 2] = b;
              rgba[outIdx + 3] = 255; // Fully opaque
            }
          }

          // Convert processed image back with original dimensions
          return sharp(rgba, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 4
            }
          })
          .resize({
            width: TARGET_WIDTH / 2,
            height: TARGET_HEIGHT,
            fit: 'inside',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .extend({
            top: 0,
            bottom: 0,
            left: isLeftSide ? 0 : TARGET_WIDTH / 2,
            right: isLeftSide ? TARGET_WIDTH / 2 : 0,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
        };

        // Process both person images with positioning
        const person1Png = await removeGreenScreen(files.person1[0].buffer, true);  // Left side
        const person2Png = await removeGreenScreen(files.person2[0].buffer, false); // Right side

        // Create final composite with precise layer ordering
        const composite = await sharp(background)
          .composite([
            {
              input: person2Png,
              top: 0,
              left: 0,
            },
            {
              input: person1Png,
              top: 0,
              left: 0,
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