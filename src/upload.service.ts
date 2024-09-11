import { Injectable, Inject } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { UPLOAD_CONFIG } from "./upload.constants";
import {
  UploadConfig,
  S3StorageConfig,
  LocalStorageConfig,
  AzureStorageConfig,
  GCPStorageConfig,
} from "./interfaces/upload-config.interface";
import * as NodeClam from "clamscan";
import { Readable } from "stream";
import sharp = require("sharp");
import { join } from "path";
import { promises as fs } from "fs";
import { BlobServiceClient } from "@azure/storage-blob";
import { Storage } from "@google-cloud/storage";
@Injectable()
export class UploadService {
  private s3Client: S3Client | null = null;
  constructor(@Inject(UPLOAD_CONFIG) private readonly config: UploadConfig) {}

  async uploadFile(file: Express.Multer.File): Promise<{ url: string }> {
    this.validateFile(file);

    if (file.mimetype.startsWith("image/")) {
      file.buffer = await this.compressImage(file);
    }

    if (this.config.virus?.enabled) {
      await this.scanForVirus(file);
    }

    const filename = file.originalname;
    const filePath = await this.storeFile(file, filename);

    return { url: filePath };
  }

  private validateFile(file: Express.Multer.File): void {
    // Get the file type based on its MIME type or extension
    const fileTypeConfig =
      this.config.fileTypes[file.mimetype] ||
      this.config.fileTypes[file.originalname.split(".").pop()];

    // If no file type config is found, throw an error
    if (!fileTypeConfig) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Check file size
    if (file.size > fileTypeConfig.maxSize) {
      throw new Error(
        `File size exceeds the maximum allowed size of ${
          fileTypeConfig.maxSize / 1024 / 1024
        } MB`
      );
    }

    // Check MIME type
    if (!fileTypeConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file MIME type: ${file.mimetype}`);
    }

    // Check file extension
    const fileExtension = file.originalname.split(".").pop();
    if (!fileTypeConfig.allowedExtensions.includes(fileExtension)) {
      throw new Error(`Invalid file extension: .${fileExtension}`);
    }
  }

  private async scanForVirus(file: Express.Multer.File): Promise<void> {
    if (!this.config.virus?.enabled) {
      return;
    }

    const clamavConfig = this.config.virus.config?.clamav;
    if (!clamavConfig) {
      throw new Error("ClamAV configuration is missing.");
    }

    // Initialize ClamAV
    const clamscan = await new NodeClam().init({
      clamdscan: {
        host: clamavConfig.host,
        port: clamavConfig.port,
        timeout: 60000, // Optional timeout in milliseconds
      },
    });

    // Create a readable stream from the file buffer
    const fileStream = Readable.from(file.buffer);

    try {
      // Scan the file's stream
      const { isInfected, viruses } = await clamscan.scanStream(fileStream);

      if (isInfected) {
        throw new Error(
          `File is infected. Viruses found: ${viruses.join(", ")}`
        );
      }
    } catch (error) {
      throw new Error(`Virus scan failed: ${error.message}`);
    }
  }

  private async compressImage(file: Express.Multer.File): Promise<Buffer> {
    if (!this.config.compression?.enabled) {
      return file.buffer;
    }

    const { quality, maxWidth, maxHeight } =
      this.config.compression.config || {};
    let image = sharp(file.buffer);

    // Resize the image if maxWidth or maxHeight are specified
    if (maxWidth || maxHeight) {
      image = image.resize(maxWidth, maxHeight, { fit: "inside" });
    }

    // Set the quality of the image if specified
    if (quality) {
      image = image.jpeg({ quality }); // Assuming JPEG format; change to png() if needed
    }

    try {
      // Convert the processed image to a Buffer
      return await image.toBuffer();
    } catch (error) {
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  private async storeFile(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const { storage } = this.config;

    switch (storage.type) {
      case "local":
        return this.storeFileLocally(file, filename);

      case "s3":
        return this.storeFileToS3(file, filename);

      case "azure":
        return this.storeFileToAzure(file, filename);

      case "gcp":
        return this.storeFileToGCP(file, filename);

      default:
        throw new Error(`Unsupported storage type: ${storage.type}`);
    }
  }
  private async storeFileLocally(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const localConfig = this.config.storage.config as LocalStorageConfig;
    const filePath = join(localConfig.destination, filename);
    await fs.writeFile(filePath, file.buffer);
    return filePath;
  }

  private async storeFileToS3(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const s3Config = this.config.storage.config as S3StorageConfig;
    const s3Client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3Client.send(command);
    return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${filename}`;
  }

  private async storeFileToAzure(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const azureConfig = this.config.storage.config as AzureStorageConfig;
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      azureConfig.connectionString
    );
    const containerClient = blobServiceClient.getContainerClient(
      azureConfig.container
    );
    const blockBlobClient = containerClient.getBlockBlobClient(filename);

    await blockBlobClient.upload(file.buffer, file.buffer.length, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    return blockBlobClient.url;
  }

  private async storeFileToGCP(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const gcpConfig = this.config.storage.config as GCPStorageConfig;
    const storage = new Storage({
      projectId: gcpConfig.projectId,
      keyFilename: gcpConfig.keyFilename,
    });

    const bucket = storage.bucket(gcpConfig.bucket);
    const fileUpload = bucket.file(filename);

    await fileUpload.save(file.buffer, {
      metadata: { contentType: file.mimetype },
    });

    return `https://storage.googleapis.com/${gcpConfig.bucket}/${filename}`;
  }
}
