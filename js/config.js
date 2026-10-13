/* ==========================================================
   CONFIGURACIÓN DEL SITIO
   ----------------------------------------------------------
   Base de datos compartida: Supabase (proyecto HappyTails).
   - url:      Project URL
   - anonKey:  publishable key. Es pública por diseño; la
               seguridad la dan las políticas RLS (supabase/esquema.sql).
   NUNCA pegues aquí la "secret key", la "service_role" ni contraseñas.
   ========================================================== */
window.CONFIG_SITIO = {
  supabase: {
    url: "https://tkdfdqyxopfjmirggcwm.supabase.co",
    anonKey: "sb_publishable_1Qwv4UvqfjreimaaEUGhRw_09JXoZ7R"
  }
};
