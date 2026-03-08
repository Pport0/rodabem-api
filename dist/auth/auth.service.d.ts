import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(data: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            nome: any;
            email: any;
        };
    }>;
    logout(token: string): Promise<{
        message: string;
    }>;
}
