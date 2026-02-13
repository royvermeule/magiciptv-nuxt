type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

export function useToast() {
  const toasts = useState<Toast[]>("toasts", () => []);

  function show(message: string, type: "success" | "error" = "success") {
    const id = Date.now();
    toasts.value = [...toasts.value, { id, message, type }];
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }, 3000);
  }

  return { toasts, show };
}
