<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const email = ref("");
const error = ref("");
const success = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  success.value = "";
  loading.value = true;
  try {
    const data = await $fetch<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: { email: email.value },
    });
    success.value = data.message;
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
      Forgot Password
    </h2>
    <p class="mt-2 text-center text-sm text-base-content/70">
      Enter your email and we'll send you a reset link.
    </p>
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
      <button
        type="submit"
        class="btn btn-primary w-full"
        :disabled="loading"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm" />
        Send Reset Link
      </button>
    </form>
    <p class="mt-4 text-center text-sm">
      Remember your password?
      <NuxtLink to="/login" class="link link-primary">
        Sign In
      </NuxtLink>
    </p>
  </div>
</template>
