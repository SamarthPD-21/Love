import multer from "multer";
import cloudinary from "../config/cloudinary";
import { UploadApiResponse } from "cloudinary";

// Multer with memory storage (no disk writes)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
});

type ResourceType = "image" | "video" | "raw" | "auto";

interface UploadOptions {
  folder?: string;
  resourceType?: ResourceType;
}

/**
 * Upload a buffer to Cloudinary.
 * Supports images, videos, and audio (audio uses resource_type "video" in Cloudinary).
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  const { folder = "home-app", resourceType = "auto" } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error("Upload failed: no result returned"));
        }
      }
    );

    uploadStream.end(buffer);
  });
}
