"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_util_1 = require("../common/utils/crypto.util");
const cpf_validator_1 = require("./validators/cpf.validator");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        if (!(0, cpf_validator_1.isValidCPF)(data.cpf)) {
            throw new common_1.BadRequestException('CPF inválido');
        }
        const senhaHash = await bcrypt.hash(data.senha, 10);
        const cpfHash = await bcrypt.hash(data.cpf, 10);
        const cpfEncrypted = (0, crypto_util_1.encrypt)(data.cpf);
        return this.prisma.user.create({
            data: {
                nome: data.nome,
                email: data.email,
                senhaHash: senhaHash,
                cpfHash: cpfHash,
                cpfEncrypted: cpfEncrypted,
                telefone: data.telefone,
            },
        });
    }
    async findAll(page, limit, nome, status) {
        const where = {};
        if (nome) {
            where.nome = {
                contains: nome,
                mode: 'insensitive',
            };
        }
        if (status !== undefined) {
            where.status = status === 'true';
        }
        const users = await this.prisma.user.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                nome: 'asc',
            },
        });
        return users.map(({ senhaHash, cpfHash, cpfEncrypted, ...user }) => user);
    }
    async update(id, data) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.BadRequestException('Usuário não encontrado');
        }
        const senhaHash = await bcrypt.hash(data.senha, 10);
        const cpfEncrypted = (0, crypto_util_1.encrypt)(data.cpf);
        const cpfHash = await bcrypt.hash(data.cpf, 10);
        const updated = await this.prisma.user.update({
            where: { id },
            data: {
                nome: data.nome,
                email: data.email,
                senhaHash,
                cpfEncrypted,
                cpfHash,
                telefone: data.telefone,
            },
        });
        const { senhaHash: s, cpfHash: c, cpfEncrypted: e, ...safe } = updated;
        return safe;
    }
    async remove(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.BadRequestException('Usuário não encontrado');
        }
        const possuiVinculo = false;
        if (possuiVinculo) {
            throw new common_1.BadRequestException('Usuário possui vínculos ativos');
        }
        await this.prisma.user.delete({
            where: { id },
        });
        return {
            message: 'Usuário excluído com sucesso!',
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map