<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const { register } = useAuth();

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  success.value = "";

  const validation = registerFormSchema.safeParse({
    email: email.value,
    password: password.value,
    confirmPassword: confirmPassword.value,
  });

  if (!validation.success) {
    error.value = validation.error.issues[0].message;
    return;
  }

  loading.value = true;
  try {
    const result = await register(validation.data.email, validation.data.password);
    success.value = result.message;
  }
  catch (e: unknown) {
    if (e && typeof e === "object" && "statusMessage" in e) {
      error.value = (e as { statusMessage: string }).statusMessage;
    }
    else {
      error.value = "An unexpected error occurred";
    }
  }
  finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h2 class="card-title justify-center text-2xl">
      Create Account
    </h2>
    <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
      <div v-if="error" role="alert" class="alert alert-error">
        <Icon name="tabler:alert-circle" class="size-5" />
        <span>{{ error }}</span>
      </div>
      <div v-if="success" role="alert" class="alert alert-success">
        <Icon name="tabler:check" class="size-5" />
        <span>{{ success }}</span>
      </div>
      <fieldset class="fieldset">
        <label class="fieldset-label" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="you@example.com"
          class="input input-bordered w-full"
          required
        >
      </fieldset>
      <fieldset class="fieldset">
        <label class="fieldset-label" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          placeholder="********"
          class="input input-bordered w-full"
          required
          minlength="8"
        >
      </fieldset>
      <fieldset class="fieldset">
        <label class="fieldset-label" for="confirm-password">Confirm Password</label>
        <input
          id="confirm-password"
          v-model="confirmPassword"
          type="password"
          placeholder="********"
          class="input input-bordered w-full"
          required
          minlength="8"
        >
      </fieldset>
      <button
        type="submit"
        class="btn btn-primary w-full"
        :disabled="loading"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm" />
        Create Account
      </button>
    </form>
    <p class="mt-4 text-center text-sm">
      Already have an account?
      <NuxtLink to="/login" class="link link-primary">
        Sign In
      </NuxtLink>
    </p>
  </div>
</template>
