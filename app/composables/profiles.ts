import type { Profile } from "../../shared/types/profile.types";

export function useProfiles() {
  const profiles = useState<Profile[]>("profiles", () => []);

  async function fetchProfiles(): Promise<void> {
    try {
      const headers = import.meta.server
        ? useRequestHeaders(["cookie"])
        : undefined;
      const data = await $fetch<Profile[]>("/api/profiles/me", { headers });
      profiles.value = data;
    }
    catch {
      profiles.value = [];
    }
  }

  async function createProfile(name: string): Promise<void> {
    const headers = import.meta.server
      ? useRequestHeaders(["cookie"])
      : undefined;
    const newProfile = await $fetch<Profile>("/api/profiles/create", {
      method: "POST",
      body: { name },
      headers,
    });
    profiles.value = [...profiles.value, newProfile];
  }

  async function deleteProfile(id: number): Promise<void> {
    await $fetch(`/api/profiles/${id}`, {
      method: "DELETE",
    });
    profiles.value = profiles.value.filter(p => p.id !== id);
  }

  return {
    profiles,
    fetchProfiles,
    createProfile,
    deleteProfile,
  };
}
