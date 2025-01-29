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

        // Process background image first - keep full size
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Helper function to process person image and remove green screen
        const removeGreenScreen = async (buffer: Buffer, isLeftSide: boolean) => {
          // Calculate position-specific dimensions
          const personWidth = TARGET_WIDTH / 2;  // Half width for side-by-side
          const personHeight = TARGET_HEIGHT;

          // Resize and process
          const { data, info } = await sharp(buffer)
            .resize({
              width: personWidth,
              height: personHeight,
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

            // Precise green screen detection
            const isGreen = 
              g > 80 && 
              g > (r * 1.3) && 
              g > (b * 1.3) && 
              Math.abs(g - r) > 30 && 
              Math.abs(g - b) > 30;

            if (isGreen) {
              rgba[outIdx] = 0;
              rgba[outIdx + 1] = 0;
              rgba[outIdx + 2] = 0;
              rgba[outIdx + 3] = 0;
            } else {
              rgba[outIdx] = r;
              rgba[outIdx + 1] = g;
              rgba[outIdx + 2] = b;
              rgba[outIdx + 3] = 255;
            }
          }

          // Create positioned image
          return sharp(rgba, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 4
            }
          })
          .extend({
            top: 0,
            bottom: 0,
            left: isLeftSide ? 0 : personWidth,
            right: isLeftSide ? personWidth : 0,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
        };

        // Process both person images with specific positioning
        const person1Png = await removeGreenScreen(files.person1[0].buffer, true);   // Left side
        const person2Png = await removeGreenScreen(files.person2[0].buffer, false);  // Right side

        // Create final composite with exact layer ordering
        const composite = await sharp(background)
          .composite([
            {
              input: person2Png,  // Person 2 in middle layer
              top: 0,
              left: 0,
            },
            {
              input: person1Png,  // Person 1 in top layer
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