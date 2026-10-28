import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encrypt, decrypt } from '../common/utils/crypto.util';

const CRYPTO_SECRET_PLACEHOLDER = 'CHANGE_ME_32_CHARS_MIN!!!!!!!!!!!';

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('CRYPTO_SECRET') ?? '';
  }

  onModuleInit() {
    if (!this.secretKey || this.secretKey === CRYPTO_SECRET_PLACEHOLDER) {
      throw new Error(
        'CRYPTO_SECRET não configurada ou com valor de exemplo. ' +
        'Defina uma chave segura de pelo menos 32 caracteres no .env.',
      );
    }
  }

  encrypt(text: string): string {
    return encrypt(text, this.secretKey);
  }

  decrypt(text: string): string {
    return decrypt(text, this.secretKey);
  }
}