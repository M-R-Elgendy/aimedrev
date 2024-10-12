import { Injectable } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileUploadService {
  private s3: S3;

  constructor(private configService: ConfigService) {
    this.s3 = new S3({
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get<string>('AWS_REGION'),
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<S3.ManagedUpload.SendData> {
    const params = {
      Bucket: this.configService.get<string>('AWS_BUCKET_NAME'),
      Key: file.originalname, // You can customize the key as needed
      Body: file.buffer, // Use buffer from the file
      ContentType: file.mimetype,
    };

    return this.s3.upload(params).promise();
  }
}
