import { IsDateString, IsOptional } from 'class-validator';

export class RelatorioQueryDto {
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
