import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { upload, uploadToCloudinary } from "../middleware/upload";

const router = Router();

// Authenticate all upload routes
router.use(authMiddleware);

/**
 * POST /api/upload
 * Uploads files (images/videos/audio) to Cloudinary.
 * Expects form-data with key "files".
 */
router.post("/", upload.array("files", 10), async (req: any, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const uploadPromises = files.map(async (file) => {
      // Determine folder based on mime type
      let folder = "memories";
      let resourceType: "image" | "video" | "raw" | "auto" = "auto";

      if (file.mimetype.startsWith("image/")) {
        folder = "memories/images";
        resourceType = "image";
      } else if (file.mimetype.startsWith("video/")) {
        folder = "memories/videos";
        resourceType = "video";
      } else if (file.mimetype.startsWith("audio/")) {
        folder = "memories/voice";
        resourceType = "auto"; // Use auto to let Cloudinary detect webm audio codec correctly
      }

      const result = await uploadToCloudinary(file.buffer, {
        folder: `home-app/${folder}`,
        resourceType,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        bytes: result.bytes,
        format: result.format,
      };
    });

    const results = await Promise.all(uploadPromises);
    res.json({ success: true, urls: results.map((r) => r.url), details: results });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({
      error: error.message || "Failed to upload files",
      details: error
    });
  }
});

export default router;
