<script setup lang="ts">
definePageMeta({
  layout: "auth",
});

const route = useRoute();
const token = computed(() => route.query.token as string);

const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const success = ref("");
const loading = ref(false);

async function handleSubmit() {
  error.value = "";
  success.value = "";

  if (password.value !== confirmPassword.value) {
    error.value = "Passwords do not match";
    return;
  }

  if (password.value.length < 8) {
    error.value = "Password must be at least 8 characters";
    return;
  }

  loading.value = true;
  try {
    const data = await $fetch<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: { token: token.value, password: password.value },
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
      Reset Password
    </h2>
    <div v-if="!token" role="alert" class="alert alert-error mt-4">
      <Icon name="tabler:alert-circle" class="size-5" />
      <span>Invalid reset link. Please request a new one.</span>
    </div>
    <form v-else class="mt-4 space-y-4" @submit.prevent="handleSubmit">
      <div v-if="error" role="alert" class="alert alert-error">
        <Icon name="tabler:alert-circle" class="size-5" />
        <span>{{ error }}</span>
      </div>
      <div v-if="success" role="alert" class="alert alert-success">
        <Icon name="tabler:check" class="size-5" />
        <span>{{ success }}</span>
        <NuxtLink to="/login" class="link link-primary">
          Sign In
        </NuxtLink>
      </div>
      <template v-if="!success">
        <fieldset class="fieldset">
          <label class="fieldset-label" for="password">New Password</label>
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
          Reset Password
        </button>
      </template>
    </form>
    <p class="mt-4 text-center text-sm">
      <NuxtLink to="/login" class="link link-primary">
        Back to Sign In
      </NuxtLink>
    </p>
  </div>
</template>
