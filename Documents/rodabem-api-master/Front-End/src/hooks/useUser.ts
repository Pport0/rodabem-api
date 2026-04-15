import { User } from "@/@types/user";
import * as SecureStore from 'expo-secure-store';

export function useUser() {
    const userRaw = SecureStore.getItem(
        process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user'
    );
    const user: User | null = userRaw ? JSON.parse(userRaw) : null;

    return {user};
}