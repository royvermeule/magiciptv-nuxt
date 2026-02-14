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

  async function createProfile(
    name: string,
    xtreamUsername: string,
    xtreamPassword: string,
    xtreamUrl: string,
    pin?: string,
  ): Promise<void> {
    const headers = import.meta.server
      ? useRequestHeaders(["cookie"])
      : undefined;
    const newProfile = await $fetch<Profile>("/api/profiles/create", {
      method: "POST",
      body: { name, xtreamUsername, xtreamPassword, xtreamUrl, pin },
      headers,
    });
    profiles.value = [...profiles.value, newProfile];
  }

  async function deleteProfile(id: number, pin?: string): Promise<void> {
    await $fetch(`/api/profiles/${id}`, {
      method: "DELETE",
      body: { pin },
    });
    profiles.value = profiles.value.filter(p => p.id !== id);
  }

  async function updateProfile(
    id: number,
    name: string,
    xtreamUsername?: string,
    xtreamPassword?: string,
    xtreamUrl?: string,
    pin?: string,
    newPin?: string,
    removePin?: boolean,
  ): Promise<void> {
    const updated = await $fetch<Profile>(`/api/profiles/${id}`, {
      method: "PATCH",
      body: { name, xtreamUsername, xtreamPassword, xtreamUrl, pin, newPin, removePin },
    });
    profiles.value = profiles.value.map(p => p.id === id ? updated : p);
  }

  async function selectProfile(id: number, pin?: string): Promise<void> {
    await $fetch(`/api/profiles/${id}/select`, {
      method: "POST",
      body: { pin },
    });
  }

  async function deselectProfile(): Promise<void> {
    await $fetch("/api/profiles/deselect", { method: "POST" });
  }

  return {
    profiles,
    fetchProfiles,
    createProfile,
    deleteProfile,
    updateProfile,
    selectProfile,
    deselectProfile,
  };
}
