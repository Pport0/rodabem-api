import { createUserDto, User } from "@/@types/user";
import { api } from "./api";

export async function getUser(id: number): Promise<User> {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
}

export async function createUser(user: createUserDto): Promise<User> {
  const response = await api.post<User>(`/users`, user);
  return response.data;
}

export async function updateUser(id: number, user: User): Promise<User> {
  const response = await api.put<User>(`/users/${id}`, user);
  return response.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/users/${id}`);
}