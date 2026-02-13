export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, fetchUser, user } = useAuth();

  const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.includes(to.path);

  if (!user.value) {
    await fetchUser();
  }

  if (!isAuthenticated.value && !isPublicRoute) {
    return navigateTo("/login");
  }

  if (isAuthenticated.value && isPublicRoute) {
    return navigateTo("/");
  }
});
