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

        // Prepare background first
        const background = await sharp(files.background[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'cover',
            position: 'center'
          })
          .toBuffer();

        // Process person1 image - remove green screen
        const person1 = await sharp(files.person1[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .removeAlpha()
          .flatten({ background: { r: 0, g: 0, b: 0 } })
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Process person2 image - remove green screen
        const person2 = await sharp(files.person2[0].buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .removeAlpha()
          .flatten({ background: { r: 0, g: 0, b: 0 } })
          .raw()
          .toBuffer({ resolveWithObject: true });

        // Create masks for green screen removal
        const createMask = async (buffer: Buffer, info: sharp.OutputInfo) => {
          const pixels = new Uint8ClampedArray(buffer);
          const mask = Buffer.alloc(buffer.length / 3);

          for (let i = 0; i < pixels.length; i += 3) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // Detect green screen (adjust threshold as needed)
            const isGreen = g > 100 && g > (r * 1.4) && g > (b * 1.4);

            mask[i / 3] = isGreen ? 0 : 255;
          }

          return sharp(mask, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 1
            }
          }).toBuffer();
        };

        // Create masks for both persons
        const mask1 = await createMask(person1.data, person1.info);
        const mask2 = await createMask(person2.data, person2.info);

        // Create final composite
        const composite = await sharp(background)
          .composite([
            {
              input: await sharp(files.person1[0].buffer)
                .resize(TARGET_WIDTH, TARGET_HEIGHT, {
                  fit: 'contain',
                  background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toBuffer(),
              blend: 'over',
              mask: mask1
            },
            {
              input: await sharp(files.person2[0].buffer)
                .resize(TARGET_WIDTH, TARGET_HEIGHT, {
                  fit: 'contain',
                  background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .toBuffer(),
              blend: 'over',
              mask: mask2
            }
          ])
          .jpeg({ quality: 90 })
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