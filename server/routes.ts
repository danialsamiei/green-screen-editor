import { createServer, type Server } from "http";
import type { Express } from "express";
import multer from "multer";
import sharp from "sharp";

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Standard size for processing
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const SPACING_PERCENT = 5; // 5% spacing between images

interface GreenScreenSettings {
  selectedColors: Array<{ r: number; g: number; b: number }>;
}

interface ImageBounds {
  left: number;
  right: number;
  width: number;
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

        const person1Settings: GreenScreenSettings = req.body.person1Settings ? 
          JSON.parse(req.body.person1Settings) : { selectedColors: [] };
        const person2Settings: GreenScreenSettings = req.body.person2Settings ? 
          JSON.parse(req.body.person2Settings) : { selectedColors: [] };

        const person1Scale = parseFloat(req.body.person1Scale) || 100;
        const person2Scale = parseFloat(req.body.person2Scale) || 100;
        const person1Position = req.body.person1Position ? JSON.parse(req.body.person1Position) : { x: 0, y: 0 };
        const person2Position = req.body.person2Position ? JSON.parse(req.body.person2Position) : { x: 0, y: 0 };

        // Helper function to convert image to PNG with transparent background and calculate bounds
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

          // Define color tolerance
          const tolerance = 30;

          // Variables to track the bounds of non-transparent pixels
          let leftBound = info.width;
          let rightBound = 0;

          // Process each pixel with color matching
          for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
              const i = (y * info.width + x) * 3;
              const outIdx = (y * info.width + x) * 4;

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
                rgba[outIdx] = 0;     // R
                rgba[outIdx + 1] = 0; // G
                rgba[outIdx + 2] = 0; // B
                rgba[outIdx + 3] = 0; // Alpha (transparent)
              } else {
                // Keep original colors and update bounds
                rgba[outIdx] = r;
                rgba[outIdx + 1] = g;
                rgba[outIdx + 2] = b;
                rgba[outIdx + 3] = 255; // Fully opaque

                // Update bounds for non-transparent pixels
                leftBound = Math.min(leftBound, x);
                rightBound = Math.max(rightBound, x);
              }
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
              left: leftBound,
              right: rightBound,
              width: info.width
            }
          };
        };

        // Process background image (no transparency)
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Process person images to PNG with transparency using their respective settings
        const person1Result = await processPersonImage(files.person1[0].buffer, person1Settings);
        const person2Result = await processPersonImage(files.person2[0].buffer, person2Settings);

        // Calculate spacing based on actual image content
        const spacingPixels = Math.floor(TARGET_WIDTH * (SPACING_PERCENT / 100));

        // Calculate positions based on bounds and spacing
        const person1X = Math.floor(TARGET_WIDTH * 0.25) - (person1Result.bounds.right - person1Result.bounds.left) / 2;
        const person2X = Math.floor(TARGET_WIDTH * 0.75) - (person2Result.bounds.right - person2Result.bounds.left) / 2;

        // Final composite with calculated positioning
        const composite = await sharp(background)
          .composite([
            {
              input: person2Result.buffer,
              gravity: 'northwest',
              left: person2X,
              top: 0
            },
            {
              input: person1Result.buffer,
              gravity: 'northwest',
              left: person1X,
              top: 0
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