import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import * as Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fromBuffer } from 'pdf2pic';

const FORMATOS_ACEITOS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

@Injectable()
export class ScanService {
  constructor(
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async processarDocumento(file: Express.Multer.File) {
    if (!FORMATOS_ACEITOS.includes(file.mimetype)) {
      throw new BadRequestException(
        'Envie o documento em um formato compatível. Formatos aceitos: PDF, JPG, JPEG, PNG.',
      );
    }

    if (file.size > TAMANHO_MAXIMO) {
      throw new BadRequestException(
        'Arquivo muito grande. O tamanho máximo permitido é 10MB.',
      );
    }

   
    const dadosExtraidos = await this.extrairDadosComOCR(file.buffer, file.mimetype);

   
    const { url, publicId } = await this.cloudinaryService.uploadFile(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    const camposObrigatoriosFaltando: string[] = [];
    if (!dadosExtraidos.placa) camposObrigatoriosFaltando.push('placa');
    if (!dadosExtraidos.modelo) camposObrigatoriosFaltando.push('modelo');
    if (!dadosExtraidos.renavam) camposObrigatoriosFaltando.push('renavam');

    const totalCampos = Object.values(dadosExtraidos).filter(Boolean).length;
    let confianca: 'alta' | 'media' | 'baixa' = 'baixa';
    if (totalCampos >= 6) confianca = 'alta';
    else if (totalCampos >= 3) confianca = 'media';

    return {
      arquivoUrl: url,
      publicId,
      dadosExtraidos,
      camposObrigatoriosFaltando,
      confianca,
      mensagem:
        camposObrigatoriosFaltando.length > 0
          ? `Extração concluída. Preencha manualmente: ${camposObrigatoriosFaltando.join(', ')}.`
          : 'Dados extraídos com sucesso. Revise antes de confirmar o cadastro.',
    };
  }

  private async extrairDadosComOCR(buffer: Buffer, mimetype: string) {
    const tempPath = path.join(os.tmpdir(), `ocr-caminhao-${Date.now()}`);
    let worker;

    try {
      console.log('Buffer size:', buffer.length);

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

      console.log('Imagem para OCR:', imagePath, '| Tamanho:', fs.statSync(imagePath).size);

      worker = await Tesseract.createWorker('por');
      const { data: { text } } = await worker.recognize(imagePath);
      await worker.terminate();

      if (!text) return this.camposVazios();

      console.log('Texto extraído pelo OCR (caminhão):\n', text);

      return this.interpretarTextoCaminhao(text);
    } catch (error) {
      console.error('Tesseract error (caminhão):', error?.message);
      if (worker) await worker.terminate().catch(() => {});
      return this.camposVazios();
    } finally {
      if (fs.existsSync(`${tempPath}.jpg`)) fs.unlinkSync(`${tempPath}.jpg`);
    }
  }

  private interpretarTextoCaminhao(texto: string) {
    const placaMatch = texto.match(/\b[A-Z]{3}[\s-]?\d[A-Z0-9]\d{2}\b|\b[A-Z]{3}[\s-]?\d{4}\b/);
    const renavamMatch = texto.match(/RENAVAM[:\s]*(\d[\d\s]{8,12}\d)/i);
    const chassiMatch = texto.match(/[A-HJ-NPR-Z0-9]{17}/);
    const anoMatch = texto.match(/\b(19|20)\d{2}\b/);

    const upper = texto.toUpperCase();
    let marca: string | null = null;
    ['VOLVO', 'SCANIA', 'MERCEDES', 'DAF', 'IVECO', 'MAN', 'FORD', 'VOLKSWAGEN'].forEach((m) => {
      if (upper.includes(m)) marca = m;
    });

    return {
      placa: placaMatch ? placaMatch[0].replace(/[\s-]/g, '') : null,
      modelo: null,
      renavam: renavamMatch ? renavamMatch[1].replace(/\s/g, '') : null,
      crv: null,
      marca,
      especieTipo: null,
      chassi: chassiMatch ? chassiMatch[0] : null,
      cor: null,
      anoFabricacao: anoMatch ? parseInt(anoMatch[0]) : null,
    };
  }

  private camposVazios() {
    return {
      placa: null,
      modelo: null,
      renavam: null,
      crv: null,
      marca: null,
      especieTipo: null,
      chassi: null,
      cor: null,
      anoFabricacao: null,
    };
  }
}