import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const http = axios.create({
  baseURL,
  timeout: 10_000,
});
