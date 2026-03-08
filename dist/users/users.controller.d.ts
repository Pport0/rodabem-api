import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(data: CreateUserDto): Promise<{
        nome: string;
        email: string;
        telefone: string | null;
        senhaHash: string;
        cpfEncrypted: string;
        cpfHash: string;
        avatarUrl: string | null;
        status: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    findAll(page?: number, limit?: number, nome?: string, status?: string): Promise<{
        nome: string;
        email: string;
        telefone: string | null;
        avatarUrl: string | null;
        status: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }[]>;
    update(id: string, data: CreateUserDto): Promise<{
        nome: string;
        email: string;
        telefone: string | null;
        avatarUrl: string | null;
        status: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
