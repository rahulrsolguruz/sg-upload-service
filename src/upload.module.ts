import { DynamicModule, Module } from "@nestjs/common";
import { UploadService } from "./upload.service";
import { UPLOAD_CONFIG } from "./upload.constants";
import { UploadConfigBuilder } from "./upload-config.builder";

@Module({})
export class UploadModule {
  static forRoot(
    configCallback: (builder: UploadConfigBuilder) => void
  ): DynamicModule {
    const builder = new UploadConfigBuilder();
    configCallback(builder);
    const config = builder.build();

    return {
      module: UploadModule,
      providers: [
        {
          provide: UPLOAD_CONFIG,
          useValue: config,
        },
        UploadService,
      ],
      exports: [UploadService],
    };
  }
}
