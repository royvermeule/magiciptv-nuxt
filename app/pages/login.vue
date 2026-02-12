<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const { login } = useAuth();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await login(email.value, password.value);
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
      Sign In
    </h2>
    <form class="mt-4 space-y-4" @submit.prevent="handleSubmit">
      <div v-if="error" role="alert" class="alert alert-error">
        <Icon name="tabler:alert-circle" class="size-5" />
        <span>{{ error }}</span>
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
        >
      </fieldset>
      <button
        type="submit"
        class="btn btn-primary w-full"
        :disabled="loading"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm" />
        Sign In
      </button>
    </form>
    <p class="mt-4 text-center text-sm">
      Don't have an account?
      <NuxtLink to="/register" class="link link-primary">
        Register
      </NuxtLink>
    </p>
  </div>
</template>
