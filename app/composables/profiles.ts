type Profile = {
  id: number;
  name: string;
};

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

  return {
    profiles,
    fetchProfiles,
  };
}
