# SG Upload Service

A NestJS package for handling file uploads with support for various storage options and configurations, including local storage, AWS S3, Azure Blob Storage, and Google Cloud Storage.

## Installation

To install the package, run:

```bash
npm install sg-upload-service
```

## Usage

### Importing the Module

Import and configure the `UploadModule` in your `AppModule` or any other module where you need file upload functionality.

#### **app.module.ts**

```typescript
import { Module } from "@nestjs/common";
import { UploadModule } from "nestjs-upload-package";

@Module({
  imports: [
    UploadModule.forRoot(
      (builder) =>
        builder
          .useS3Storage(
            process.env.AWS_ACCESS_KEY_ID,
            process.env.AWS_SECRET_ACCESS_KEY,
            process.env.AWS_REGION,
            process.env.AWS_BUCKET_NAME
          )
          .enableCompression(80, 800, 600) // Enable image compression
          .enableVirusScanning("localhost", 3310) // Enable virus scanning
          .enableChunkedUploads(1024 * 1024) // 1MB chunks
    ),
  ],
})
export class AppModule {}
```

### Configuration

The `UploadConfigBuilder` allows you to configure different aspects of file uploads. Below are examples for different storage options.

#### **AWS S3 Storage**

```typescript
import { UploadModule } from "nestjs-upload-package";

@Module({
  imports: [
    UploadModule.forRoot(
      (builder) =>
        builder
          .useS3Storage(
            process.env.AWS_ACCESS_KEY_ID,
            process.env.AWS_SECRET_ACCESS_KEY,
            process.env.AWS_REGION,
            process.env.AWS_BUCKET_NAME
          )
          .enableCompression() // Optional
    ),
  ],
})
export class AppModule {}
```

#### **Azure Blob Storage**

```typescript
import { UploadModule } from "nestjs-upload-package";

@Module({
  imports: [
    UploadModule.forRoot(
      (builder) =>
        builder
          .useAzureStorage(
            process.env.AZURE_CONNECTION_STRING,
            process.env.AZURE_CONTAINER_NAME
          )
          .enableCompression() // Optional
    ),
  ],
})
export class AppModule {}
```

#### **Google Cloud Storage**

```typescript
import { UploadModule } from "sg-upload-service";

@Module({
  imports: [
    UploadModule.forRoot(
      (builder) =>
        builder
          .useGCPStorage(
            process.env.GCP_PROJECT_ID,
            process.env.GCP_KEY_FILENAME,
            process.env.GCP_BUCKET_NAME
          )
          .enableCompression() // Optional
    ),
  ],
})
export class AppModule {}
```

### Controller Example

Here's an example of how to use the `UploadService` in a controller for handling file uploads.

#### **upload.controller.ts**

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadService } from "sg-upload-service";

@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post("single")
  @UseInterceptors(FileInterceptor("file"))
  async uploadSingle(@UploadedFile() file: Express.Multer.File) {
    try {
      const result = await this.uploadService.uploadFile(file);
      return { url: result.url };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
```

### Features

- **Storage Options**: Supports local storage, AWS S3, Azure Blob Storage, and Google Cloud Storage.
- **File Validation**: Validate file types, sizes, and extensions.
- **Virus Scanning**: Optionally enable virus scanning using ClamAV.
- **Image Compression**: Compress images with configurable quality, width, and height.
- **Chunked Uploads**: Support for chunked uploads to handle large files.

### Methods

- **`uploadFile(file: Express.Multer.File): Promise<{ url: string }>`**: Uploads a file and returns the URL.
- **`updateFile(key: string, file: Express.Multer.File): Promise<{ url: string }>`**: Updates an existing file.
- **`deleteFile(key: string): Promise<void>`**: Deletes a file.
- **`processAndChunkMedia(file: Express.Multer.File): Promise<{ streamId: string }>`**: Processes and chunks media files.
- **`streamMedia(streamId: string, res: Response)`**: Streams media files.

### License

This package is licensed under the [MIT License](LICENSE).

### Author

SolGuruz® LLP

### Developer

Rahul Rathod
