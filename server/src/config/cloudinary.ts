import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

const cloudinaryUrl = process.env.CLOUDINARY_URL;

if (cloudinaryUrl) {
  const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@([^\/?#]+)/);
  if (match) {
    const [, apiKey, apiSecret, cloudName] = match;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  } else {
    cloudinary.config();
  }
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export default cloudinary;
