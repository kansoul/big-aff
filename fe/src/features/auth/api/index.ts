import { apiURL } from "@/config";
import { axiosInstance } from "@/shared/api/axios";
import type { ApiResponse, User } from "@/shared/types";
import type { LoginCredentials } from "../types/login";

export const loginApi = {
  async getCsrfCookie() {
    const baseURL = apiURL.replace(/\/api$/, "");
    return axiosInstance.get(`${baseURL}/sanctum/csrf-cookie`);
  },

  async login(credentials: LoginCredentials): Promise<User> {
    await this.getCsrfCookie();
    const response = await axiosInstance.post<ApiResponse<User>>(
      "/auth/login",
      credentials,
    );
    return response.data.data;
  },
};
