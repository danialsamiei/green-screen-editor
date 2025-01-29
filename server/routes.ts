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

        // Helper function to convert image to PNG with transparent background
        const processPersonImage = async (buffer: Buffer) => {
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

          // Process each pixel with more precise green screen detection
          for (let i = 0; i < pixels.length; i += 3) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const outIdx = (i / 3) * 4;

            // Enhanced green screen detection with stricter thresholds
            const isGreenScreen = 
              g > 150 && // Significant green component
              g > (r * 1.8) && // Green much higher than red
              g > (b * 1.8) && // Green much higher than blue
              r < 150 && // Limited red
              b < 150 && // Limited blue
              (g - Math.max(r, b)) > 40; // Ensure significant green difference

            if (isGreenScreen) {
              // Make green screen fully transparent
              rgba[outIdx] = 0;     // R
              rgba[outIdx + 1] = 0; // G
              rgba[outIdx + 2] = 0; // B
              rgba[outIdx + 3] = 0; // Alpha (transparent)
            } else {
              // Keep original colors exactly as they are
              rgba[outIdx] = r;
              rgba[outIdx + 1] = g;
              rgba[outIdx + 2] = b;
              rgba[outIdx + 3] = 255; // Fully opaque
            }
          }

          // Convert back to PNG with transparency
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

        // Process background image (no transparency)
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Process person images to PNG with transparency
        const person1Png = await processPersonImage(files.person1[0].buffer);
        const person2Png = await processPersonImage(files.person2[0].buffer);

        // Final composite with proper positioning
        const composite = await sharp(background)
          .composite([
            {
              input: person2Png,
              gravity: 'east', // Position person2 on the right
              top: 0,
              left: Math.floor(TARGET_WIDTH / 2) // Start from middle
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