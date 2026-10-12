/* ==========================================================
   CONFIGURACIÓN DEL SITIO
   ----------------------------------------------------------
   Base de datos compartida (opcional): Supabase.
   Déjalo vacío para usar el modo local (solo este navegador).
   Pasos completos en README.md → "Activar Supabase".

   - url:      Project URL  (Supabase → Project Settings → API)
   - anonKey:  anon / publishable key. Es pública por diseño; la
               seguridad la dan las políticas RLS del README.
   NUNCA pegues aquí la "service_role" ni contraseñas.

   El número de WhatsApp, nombre del albergue y contacto NO se
   editan aquí: se cambian desde el Panel de administración.
   ========================================================== */
window.CONFIG_SITIO = {
  supabase: {
    url: "",
    anonKey: ""
  }
};
