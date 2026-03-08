import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(data: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            nome: any;
            email: any;
        };
    }>;
    logout(req: any): Promise<{
        message: string;
    }>;
}
