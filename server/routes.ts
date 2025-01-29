import { createServer, type Server } from "http";
import type { Express } from "express";
import multer from "multer";
import sharp from "sharp";

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Standard size for processing
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

interface GreenScreenSettings {
  hueMin: number;
  hueMax: number;
  saturationMin: number;
  valueMin: number;
  greenMultiplier: number;
}

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

        const person1Settings: GreenScreenSettings = JSON.parse(req.body.person1Settings);
        const person2Settings: GreenScreenSettings = JSON.parse(req.body.person2Settings);

        // Helper function to convert RGB to HSV
        const rgbToHsv = (r: number, g: number, b: number) => {
          r /= 255;
          g /= 255;
          b /= 255;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const diff = max - min;

          let h = 0;
          if (diff === 0) h = 0;
          else if (max === r) h = ((g - b) / diff) % 6;
          else if (max === g) h = (b - r) / diff + 2;
          else h = (r - g) / diff + 4;

          h = Math.round(h * 60);
          if (h < 0) h += 360;

          const s = max === 0 ? 0 : (diff / max) * 100;
          const v = max * 100;

          return { h, s, v };
        };

        // Helper function to convert image to PNG with transparent background
        const processPersonImage = async (buffer: Buffer, settings: GreenScreenSettings) => {
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

          // Process each pixel with advanced HSV-based green screen detection
          for (let i = 0; i < pixels.length; i += 3) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const outIdx = (i / 3) * 4;

            // Convert RGB to HSV for better color analysis
            const hsv = rgbToHsv(r, g, b);

            // Use provided settings for green screen detection
            const isGreenScreen = 
              (hsv.h >= settings.hueMin && hsv.h <= settings.hueMax) && // Custom hue range
              (hsv.s >= settings.saturationMin) && // Custom saturation minimum
              (hsv.v >= settings.valueMin) && // Custom value minimum
              (g > r * settings.greenMultiplier) && // Custom green multiplier
              (g > b * settings.greenMultiplier); // Custom green multiplier

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

        // Process person images to PNG with transparency using their respective settings
        const person1Png = await processPersonImage(files.person1[0].buffer, person1Settings);
        const person2Png = await processPersonImage(files.person2[0].buffer, person2Settings);

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