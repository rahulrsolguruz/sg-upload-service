export interface FileTypeConfig {
  maxSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export interface StorageConfig {
  type: "local" | "s3" | "azure" | "gcp";
  config:
    | LocalStorageConfig
    | S3StorageConfig
    | AzureStorageConfig
    | GCPStorageConfig;
}

export interface LocalStorageConfig {
  destination: string;
}

export interface S3StorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
}

export interface AzureStorageConfig {
  connectionString: string;
  container: string;
}

export interface GCPStorageConfig {
  projectId: string;
  keyFilename: string;
  bucket: string;
}

export interface UploadConfig {
  storage: StorageConfig;
  fileTypes: {
    [key: string]: FileTypeConfig;
  };
  defaultMaxSize: number;
  virus?: {
    enabled: boolean;
    config?: {
      clamav: {
        host: string;
        port: number;
      };
    };
  };
  compression?: {
    enabled: boolean;
    config?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    };
  };
  chunks?: {
    enabled: boolean;
    size?: number;
  };
}
