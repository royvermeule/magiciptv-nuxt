import type { Ref } from "vue";

type AuthUser = {
  id: number;
  email: string;
};

export function useAuth() {
  const user: Ref<AuthUser | null> = useState<AuthUser | null>("auth-user", () => null);
  const isAuthenticated = computed(() => !!user.value);

  async function fetchUser(): Promise<void> {
    try {
      const headers = import.meta.server
        ? useRequestHeaders(["cookie"])
        : undefined;
      const data = await $fetch<{ user: AuthUser }>("/api/auth/me", { headers });
      user.value = data.user;
    }
    catch {
      user.value = null;
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const data = await $fetch<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    user.value = data.user;
    await navigateTo("/");
  }

  async function register(email: string, password: string): Promise<{ message: string }> {
    const data = await $fetch<{ success: boolean; message: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password },
    });
    return { message: data.message };
  }

  async function logout(): Promise<void> {
    try {
      await $fetch("/api/auth/logout", { method: "POST" });
    }
    catch {
      // Ignore errors on logout
    }
    user.value = null;
    await navigateTo("/login");
  }

  return {
    user: readonly(user),
    isAuthenticated,
    fetchUser,
    login,
    register,
    logout,
  };
}
