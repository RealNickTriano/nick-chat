import { http } from "./http";
import type { User } from "@/types/user";

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export function loginUrl(): string {
  return `${apiBase}/auth/login/google`;
}

export async function fetchMe(): Promise<User | null> {
  try {
    const res = await http.get<User>("/auth/me");
    return res.data;
  } catch (err) {
    if (isAxiosStatus(err, 401)) return null;
    throw err;
  }
}

export async function logout(): Promise<void> {
  await http.post("/auth/logout");
}

function isAxiosStatus(err: unknown, status: number): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { status?: number } }).response?.status === "number" &&
    (err as { response: { status: number } }).response.status === status
  );
}
