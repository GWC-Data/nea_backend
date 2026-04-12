// src/config/multerConfig.ts

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';

// Create upload directories if they don't exist
const uploadDir = path.join(process.cwd(), 'uploads');
const tempDir = path.join(uploadDir, 'temp_chunks');
const completedDir = path.join(uploadDir, 'completed_files');
const wasteImageDir = path.join(uploadDir, 'waste_images');
const eventImageDir = path.join(uploadDir, 'event_images');

[uploadDir, tempDir, completedDir, wasteImageDir, eventImageDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer storage configuration for waste images
const wasteImageStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, wasteImageDir);
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename: eventlog-timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `waste-image-${uniqueSuffix}${ext}`);
  }
});

// File filter for image uploads
const imageFileFilter = (_req: any, file: any, cb: FileFilterCallback): void => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`));
  }
};

// Multer instance for waste images
export const wasteImageUpload = multer({
  storage: wasteImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Multer storage configuration for event images
const eventImageStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, eventImageDir);
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `event-image-${uniqueSuffix}${ext}`);
  }
});

// Multer instance for event images
export const eventImageUpload = multer({
  storage: eventImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper function to get relative path from absolute path
export const getRelativeImagePath = (absolutePath: string): string => {
  return path.relative(process.cwd(), absolutePath);
};

// Helper function to get absolute path from relative path
export const getAbsoluteImagePath = (relativePath: string): string => {
  return path.join(process.cwd(), relativePath);
};

// Helper function to delete image file
export const deleteImageFile = async (relativePath: string): Promise<void> => {
  try {
    const absolutePath = getAbsoluteImagePath(relativePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
};
