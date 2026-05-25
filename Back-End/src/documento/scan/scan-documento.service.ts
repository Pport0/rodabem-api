import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../../caminhao/scan/cloudinary.service';
import * as Tesseract from 'tesseract.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fromBuffer } from 'pdf2pic';

const FORMATOS_ACEITOS = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

@Injectable()
export class ScanDocumentoService {
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

    const { url, publicId } = await this.cloudinaryService.uploadFile(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    const dadosExtraidos = await this.extrairDadosComOCR(file.buffer, file.mimetype);

    const camposObrigatoriosFaltando: string[] = [];
    if (!dadosExtraidos.nome) camposObrigatoriosFaltando.push('nome');
    if (!dadosExtraidos.numero) camposObrigatoriosFaltando.push('numero');
    if (!dadosExtraidos.dataEmissao) camposObrigatoriosFaltando.push('dataEmissao');
    if (!dadosExtraidos.dataVencimento) camposObrigatoriosFaltando.push('dataVencimento');

    const totalCampos = Object.values(dadosExtraidos).filter(Boolean).length;
    let confianca: 'alta' | 'media' | 'baixa' = 'baixa';
    if (totalCampos >= 4) confianca = 'alta';
    else if (totalCampos >= 2) confianca = 'media';

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
    const tempPath = path.join(os.tmpdir(), `ocr-${Date.now()}`);
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

      console.log('Texto extraído pelo OCR:\n', text);

      return this.interpretarTexto(text);
    } catch (error) {
      console.error('Tesseract error:', error?.message);
      if (worker) await worker.terminate().catch(() => {});
      return this.camposVazios();
    } finally {
      if (fs.existsSync(`${tempPath}.jpg`)) fs.unlinkSync(`${tempPath}.jpg`);
    }
  }

  private interpretarTexto(texto: string) {
    const nome = this.detectarNomeDocumento(texto);
    const numero = this.detectarNumero(texto, nome);
    const datas = this.detectarDatas(texto);

    return {
      nome,
      numero,
      dataEmissao: datas.emissao,
      dataVencimento: datas.vencimento,
      observacao: null,
    };
  }

  private detectarNomeDocumento(texto: string): string | null {
    const upper = texto.toUpperCase();
    if (upper.includes('HABILITAÇÃO') || upper.includes('CNH') || upper.includes('CARTEIRA NACIONAL')) return 'CNH';
    if (upper.includes('CRLV') || upper.includes('LICENCIAMENTO')) return 'CRLV';
    if (upper.includes('CRV') || upper.includes('CERTIFICADO DE REGISTRO')) return 'CRV';
    if (upper.includes('IDENTIDADE') || upper.includes('R.G') || upper.includes('RG')) return 'RG';
    if (upper.includes('CPF') || upper.includes('CADASTRO DE PESSOA')) return 'CPF';
    return null;
  }

  private detectarNumero(texto: string, tipoDoc: string | null): string | null {
    if (tipoDoc === 'CNH') {
      const match = texto.match(/\b\d{11}\b/);
      if (match) return match[0];
    }

    if (tipoDoc === 'CRLV' || tipoDoc === 'CRV') {
      const renavamMatch = texto.match(/RENAVAM[:\s]*(\d[\d\s]{8,12}\d)/i);
      if (renavamMatch) return renavamMatch[1].replace(/\s/g, '');
    }

    const match = texto.match(/\b\d{7,15}\b/);
    return match ? match[0] : null;
  }

  private detectarDatas(texto: string): { emissao: string | null; vencimento: string | null } {
    const vencimentoMatch = texto.match(
      /(?:validade|vencimento|válido\s*até|val\.|VALIDADE)[:\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i,
    );

    const emissaoMatch = texto.match(
      /(?:emiss[aã]o|expedição|1ª\s*hab|EMISSÃO|primeira\s*habilitação)[:\s]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i,
    );

    const regexData = /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/g;
    const todasDatas: { data: string; index: number }[] = [];
    let match;

    while ((match = regexData.exec(texto)) !== null) {
      const [, dia, mes, ano] = match;
      if (parseInt(ano) >= 2000) {
        todasDatas.push({
          data: `${ano}-${mes}-${dia}`,
          index: match.index,
        });
      }
    }

    todasDatas.sort((a, b) => a.data.localeCompare(b.data));

    const emissao = emissaoMatch
      ? `${emissaoMatch[3]}-${emissaoMatch[2]}-${emissaoMatch[1]}`
      : todasDatas[0]?.data ?? null;

    const vencimento = vencimentoMatch
      ? `${vencimentoMatch[3]}-${vencimentoMatch[2]}-${vencimentoMatch[1]}`
      : todasDatas[todasDatas.length - 1]?.data ?? null;

    return { emissao, vencimento };
  }

  private camposVazios() {
    return {
      nome: null,
      numero: null,
      dataEmissao: null,
      dataVencimento: null,
      observacao: null,
    };
  }
}