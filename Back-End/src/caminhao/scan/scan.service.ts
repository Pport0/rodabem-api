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

  const renavamMatch = texto.match(/\b(\d{11})\b/);

  const chassiMatch = texto.match(/[A-HJ-NPR-Z0-9]{17}/);

  const anoDuploMatch = texto.match(/ano\S*[\s\S]{0,40}?ano\S*[\s\S]{0,150}?\b((?:19|20)\d{2})\s+((?:19|20)\d{2})\b/i);

  const parAnosMatch = texto.match(/\b((?:19|20)\d{2})\s+((?:19|20)\d{2})\b/);

  const anoFallback = texto.match(/\b(19|20)\d{2}\b/);

  const modeloLinhaMatch = texto.match(/\b([A-Z]{2,})\/([A-Z0-9\s]+\d{2,4})\b/);

  const corMatch = texto.match(
    /\b(BRANCA|BRANCO|PRETA|PRETO|CINZA|AZUL|VERMELHA|VERMELHO|VERDE|AMARELA|AMARELO|PRATA|MARROM|BEGE|DOURADA|DOURADO)\b/i,
  );

  const especieMatch = texto.match(
    /\b(CAMINHAO\s*TRATOR|CAMINH[ÃA]O|REBOQUE|SEMI[\s-]?REBOQUE|CAVALO\s*MECANICO|UTILITARIO|ÔNIBUS|MICRO[\s-]?ONIBUS)\b/i,
  );

  const upper = texto.toUpperCase();
  let marca: string | null = null;
  ['VOLVO', 'SCANIA', 'MERCEDES', 'DAF', 'IVECO', 'MAN', 'FORD', 'VOLKSWAGEN'].forEach((m) => {
    if (upper.includes(m)) marca = m;
  });

  let modelo: string | null = null;
  if (modeloLinhaMatch) {
    const marcaEncontrada = modeloLinhaMatch[1];
    const resto = modeloLinhaMatch[2].trim();
    
    modelo = resto;
    if (!marca) marca = marcaEncontrada;
  }

  return {
    placa: placaMatch ? placaMatch[0].replace(/[\s-]/g, '') : null,
    modelo,
    renavam: renavamMatch ? renavamMatch[1] : null,
    crv: null,
    marca,
    especieTipo: especieMatch ? especieMatch[0].replace(/\s+/g, ' ').trim() : null,
    chassi: chassiMatch ? chassiMatch[0] : null,
    cor: corMatch ? corMatch[0].toUpperCase() : null,
    anoFabricacao: anoDuploMatch
  ? parseInt(anoDuploMatch[1])
  : parAnosMatch
  ? parseInt(parAnosMatch[1])
  : anoFallback
  ? parseInt(anoFallback[0])
  : null,
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