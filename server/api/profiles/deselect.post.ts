export default defineEventHandler((event) => {
  deleteCookie(event, "profile_id", {
    path: "/",
  });

  return { success: true };
});
