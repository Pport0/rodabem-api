import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TermosService {
  constructor(private prisma: PrismaService) {}

  /** Retorna o termo vigente (ativo = true). */
  async vigente() {
    const termo = await this.prisma.termoUso.findFirst({
      where: { ativo: true },
      select: { id: true, versao: true, conteudo: true, publicadoEm: true },
    });
    if (!termo) throw new NotFoundException('Nenhum termo de uso publicado.');
    return termo;
  }

  /**
   * Registra aceite do usuário.
   * Lança erro se a versão informada não for a vigente.
   */
  async registrarAceite(
    userId: number,
    termoVersao: string,
    ip?: string,
    userAgent?: string,
  ) {
    const vigente = await this.vigente();

    if (vigente.versao !== termoVersao) {
      throw new NotFoundException(
        `Versão "${termoVersao}" não é a vigente. Aceite a versão "${vigente.versao}".`,
      );
    }

    
    await this.prisma.aceiteTermo.upsert({
      where: { userId_termoId: { userId, termoId: vigente.id } },
      create: { userId, termoId: vigente.id, ip, userAgent },
      update: { aceitoEm: new Date(), ip, userAgent },
    });

    return { aceito: true, versao: vigente.versao };
  }

  /**
   * Verifica se o usuário aceitou o termo vigente.
   * Usado pelo middleware e pelo GET /users/me.
   */
  async termoPendente(userId: number): Promise<boolean> {
    const vigente = await this.prisma.termoUso.findFirst({
      where: { ativo: true },
      select: { id: true },
    });
    if (!vigente) return false; 

    const aceite = await this.prisma.aceiteTermo.findUnique({
      where: { userId_termoId: { userId, termoId: vigente.id } },
    });
    return aceite === null;
  }
}