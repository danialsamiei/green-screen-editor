import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import sharp from "sharp";

const storage = multer.memoryStorage();
const upload = multer({ storage });

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

        // Process person1 image - remove green screen
        const person1 = await sharp(files.person1[0].buffer)
          .removeAlpha()
          .greyscale()
          .threshold(128)
          .toBuffer();

        // Process person2 image - remove green screen
        const person2 = await sharp(files.person2[0].buffer)
          .removeAlpha()
          .greyscale()
          .threshold(128)
          .toBuffer();

        // Create composite image
        const composite = await sharp(files.background[0].buffer)
          .composite([
            { input: person1, blend: "over" },
            { input: person2, blend: "over" },
          ])
          .jpeg()
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
