import {
  UploadConfig,
  StorageConfig,
  FileTypeConfig,
} from "./interfaces/upload-config.interface";

export class UploadConfigBuilder {
  private config: Partial<UploadConfig> = {};

  useLocalStorage(destination: string): this {
    this.config.storage = { type: "local", config: { destination } };
    return this;
  }

  useS3Storage(
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    bucket: string,
    endpoint?: string
  ): this {
    this.config.storage = {
      type: "s3",
      config: { accessKeyId, secretAccessKey, region, bucket, endpoint },
    };
    return this;
  }

  useAzureStorage(connectionString: string, container: string): this {
    this.config.storage = {
      type: "azure",
      config: { connectionString, container },
    };
    return this;
  }

  useGCPStorage(projectId: string, keyFilename: string, bucket: string): this {
    this.config.storage = {
      type: "gcp",
      config: { projectId, keyFilename, bucket },
    };
    return this;
  }

  setFileType(name: string, config: FileTypeConfig): this {
    if (!this.config.fileTypes) {
      this.config.fileTypes = {};
    }
    this.config.fileTypes[name] = config;
    return this;
  }

  setDefaultMaxSize(size: number): this {
    this.config.defaultMaxSize = size;
    return this;
  }

  enableVirusScanning(host: string, port: number): this {
    this.config.virus = { enabled: true, config: { clamav: { host, port } } };
    return this;
  }

  enableCompression(
    quality?: number,
    maxWidth?: number,
    maxHeight?: number
  ): this {
    this.config.compression = {
      enabled: true,
      config: { quality, maxWidth, maxHeight },
    };
    return this;
  }

  enableChunkedUploads(size?: number): this {
    this.config.chunks = { enabled: true, size };
    return this;
  }

  build(): UploadConfig {
    if (!this.config.storage) {
      throw new Error("Storage configuration is required");
    }
    if (!this.config.fileTypes) {
      throw new Error("At least one file type configuration is required");
    }
    if (!this.config.defaultMaxSize) {
      this.config.defaultMaxSize = 5 * 1024 * 1024; // 5MB default
    }
    return this.config as UploadConfig;
  }
}
