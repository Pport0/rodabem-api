import { Injectable, BadRequestException } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fromBuffer } from 'pdf2pic';
import { fileTypeFromBuffer } from 'file-type';

const FORMATOS_ACEITOS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const TAMANHO_MAXIMO = 12 * 1024 * 1024;

@Injectable()
export class HodometroScanService {
  async processarHodometro(file: any) {
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Arquivo vazio não é permitido.');
    }

    const tipoReal = await fileTypeFromBuffer(file.buffer);
    const mimetypeReal = tipoReal?.mime ?? null;

    if (!mimetypeReal || !FORMATOS_ACEITOS.includes(mimetypeReal)) {
      throw new BadRequestException(
        'Envie a imagem em um formato compatível. Formatos aceitos: JPG, JPEG, PNG, PDF.',
      );
    }

    if (file.size > TAMANHO_MAXIMO) {
      throw new BadRequestException(
        'Arquivo muito grande. O tamanho máximo permitido é 12MB.',
      );
    }

    const quilometragem = await this.extrairQuilometragem(file.buffer, mimetypeReal);

    return {
      quilometragem,
      confianca: quilometragem !== null ? 'media' : 'baixa',
      mensagem: quilometragem !== null
        ? 'Quilometragem extraída. Revise antes de confirmar.'
        : 'Não foi possível extrair a quilometragem. Preencha manualmente.',
    };
  }

  private async extrairQuilometragem(buffer: Buffer, mimetype: string): Promise<number | null> {
    const tempPath = path.join(os.tmpdir(), `ocr-hodometro-${Date.now()}`);
    let worker;

    try {
      let imagePath: string;

      if (mimetype === 'application/pdf') {
        const convert = fromBuffer(buffer, {
          density: 200,
          saveFilename: path.basename(tempPath),
          savePath: os.tmpdir(),
          format: 'jpg',
          width: 2480,
          height: 3508,
        });
        const result = await convert(1);
        imagePath = result.path;
      } else {
        imagePath = `${tempPath}.jpg`;
        fs.writeFileSync(imagePath, buffer);
      }

      worker = await Tesseract.createWorker('por');
      const { data: { text } } = await worker.recognize(imagePath);
      await worker.terminate();

      console.log('Texto extraído pelo OCR (hodômetro):\n', text);

      return this.interpretarQuilometragem(text);
    } catch (error: any) {
      console.error('Tesseract error (hodômetro):', error?.message);
      if (worker) await worker.terminate().catch(() => {});
      return null;
    } finally {
      if (fs.existsSync(`${tempPath}.jpg`)) fs.unlinkSync(`${tempPath}.jpg`);
    }
  }

  private interpretarQuilometragem(texto: string): number | null {
    
    const limpo = texto.replace(/[^\d\s.,]/g, ' ').replace(/\s+/g, ' ');

    const candidatos = limpo.match(/\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{4,7}\b/g);

    if (!candidatos || candidatos.length === 0) return null;

    const valores = candidatos
      .map(v => parseInt(v.replace(/[.,]/g, ''), 10))
      .filter(v => v >= 1 && v <= 9999999);

    if (valores.length === 0) return null;

    return Math.max(...valores);
  }
}