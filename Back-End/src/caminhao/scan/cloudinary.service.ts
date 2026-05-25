import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

async uploadFile(
  buffer: Buffer,
  mimetype: string,
  originalname: string,
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'rodabem/documentos-caminhao',
          resource_type: 'auto',
          public_id: `${Date.now()}-${originalname.replace(/\s/g, '_')}`,
          timeout: 120000, 
        },
        (error, result) => {
          if (error || !result) {
            console.error('Cloudinary error:', error);
            return reject(
              new BadRequestException('Erro ao fazer upload do arquivo.'),
            );
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      )
      .end(buffer);
  });
}

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}