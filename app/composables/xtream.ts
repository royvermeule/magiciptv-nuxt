export function useXtream() {
  const testing = ref(false);
  const connectionStatus = ref<"idle" | "success" | "error">("idle");
  const connectionError = ref("");

  async function testConnection(
    xtreamUsername: string,
    xtreamPassword: string,
    xtreamUrl: string,
  ): Promise<void> {
    testing.value = true;
    connectionStatus.value = "idle";
    connectionError.value = "";

    try {
      await $fetch("/api/xtream/test", {
        method: "POST",
        body: { xtreamUsername, xtreamPassword, xtreamUrl },
      });
      connectionStatus.value = "success";
    }
    catch (e: unknown) {
      connectionStatus.value = "error";
      if (e && typeof e === "object" && "statusMessage" in e) {
        connectionError.value = (e as { statusMessage: string }).statusMessage;
      }
      else {
        connectionError.value = "Failed to test connection";
      }
    }
    finally {
      testing.value = false;
    }
  }

  function resetConnection() {
    connectionStatus.value = "idle";
    connectionError.value = "";
  }

  return {
    testing,
    connectionStatus,
    connectionError,
    testConnection,
    resetConnection,
  };
}
