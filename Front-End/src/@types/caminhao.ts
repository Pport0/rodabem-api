export interface Caminhao {
    id?: number;
    placa: string;
    modelo: string;
    renavam: string;
    crv?: string;
    marca?: string;
    especieTipo?: string;
    chassi?: string;
    cor?: string;
    anoFabricacao?: number;
    numeroEixos?: number;
}

export interface CreateCaminhaoDto {
    placa: string;
    modelo: string;
    renavam: string;
    crv?: string;
    marca?: string;
    especieTipo?: string;
    chassi?: string;
    cor?: string;
    anoFabricacao?: number;
    numeroEixos?: number;
}

export interface UpdateCaminhaoDto {
    placa?: string;
    modelo?: string;
    renavam?: string;
    crv?: string;
    marca?: string;
    especieTipo?: string;
    chassi?: string;
    cor?: string;
    anoFabricacao?: number;
    numeroEixos?: number;
}
