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

        // Helper function to remove green screen and create mask
        const processPersonImage = async (buffer: Buffer) => {
          const processedImage = await sharp(buffer)
            .resize(TARGET_WIDTH, TARGET_HEIGHT, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .raw()
            .toBuffer({ resolveWithObject: true });

          const { data, info } = processedImage;
          const pixels = new Uint8ClampedArray(data);
          const mask = Buffer.alloc(data.length / 3);

          for (let i = 0; i < pixels.length; i += 3) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // Refined green screen detection with more lenient thresholds
            const isGreen = g > 90 && // Lower green threshold
              g > (r * 1.2) && // More lenient red ratio
              g > (b * 1.2);  // More lenient blue ratio

            mask[i / 3] = isGreen ? 0 : 255;
          }

          const processedMask = await sharp(mask, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 1
            }
          })
          .blur(0.5) // Slight blur to smooth mask edges
          .toBuffer();

          const personImage = await sharp(buffer)
            .resize(TARGET_WIDTH, TARGET_HEIGHT, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer();

          return { image: personImage, mask: processedMask };
        };

        // Process both person images
        const person1 = await processPersonImage(files.person1[0].buffer);
        const person2 = await processPersonImage(files.person2[0].buffer);

        // Create final composite with explicit positioning
        const composite = await sharp(background)
          .composite([
            {
              input: person1.image,
              blend: 'over',
              mask: person1.mask,
              gravity: 'center'
            },
            {
              input: person2.image,
              blend: 'over',
              mask: person2.mask,
              gravity: 'center'
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