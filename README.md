# Happy Tails · Sitio web de adopción

Sitio web de adopción responsable con:
- catálogo filtrable,
- fichas individuales con ficha médica,
- formulario de interés que prepara un mensaje de WhatsApp,
- panel de administración.

Es HTML, CSS y JavaScript puros. **No necesita instalar nada ni compilar.**

---

## 1. Contenido de la carpeta

```
index.html               Página principal
css/estilos.css          Diseño (colores y tipografías al inicio, como variables)
js/config.js             Configuración de Supabase (opcional)
js/almacenamiento.js     Dónde se guardan los datos (Supabase, o local en el navegador)
js/app.js                Catálogo, filtros, fichas, formulario y panel de administración
data/perritos.js         Registros iniciales (18 registros extraídos (17 perritos y 1 gata) de los afiches del ZIP)
data/perritos.json       Los mismos registros en JSON (para importar o respaldar)
fotos/<nombre>.jpg       Foto recortada de cada animal (sale del afiche original)
fotos/afiches/<nombre>.jpg  Afiche original reducido (se muestra en la ficha)
supabase/esquema.sql     Script para crear la base de datos compartida (opcional)
```

Cada foto conserva el nombre del archivo original del ZIP: `bruno.jpg` corresponde a Bruno, `canela.jpg` a Canela, y así sucesivamente. La excepción es Mota, cuyo archivo original se llama `motal.jpg`.

---

## 2. Ejecutarlo en tu computadora

### Opción A: doble clic

Abre `index.html` con Chrome, Edge o Firefox. Funciona en modo local.

### Opción B: servidor local (recomendado)

Así el navegador se comporta igual que en internet.

1. Instala Python (python.org) si no lo tienes.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta: `python -m http.server 8000`
4. Entra a <http://localhost:8000>.

Otra alternativa es VS Code con la extensión **Live Server**: clic derecho en `index.html` → *Open with Live Server*.

---

## 3. Panel de administración

### Cómo abrirlo

Haz clic en el botón **Administrar** del pie de página, o agrega `#admin` al final de la dirección (por ejemplo, `http://localhost:8000/#admin`).

### Pestaña Perritos

- **Agregar:** usa “+ Agregar perrito”.
- **Editar:** botón “Editar”. Desde ahí cambias:
  - fotos (subir, elegir la principal, quitar),
  - edad, raza, historia, personalidad, energía y compatibilidad,
  - ficha médica: última vacuna, vacunas con fecha, desparasitación, esterilización, enfermedades y próximo control.
- **Cambiar el estado:** usa el selector de la lista: *Disponible*, *En proceso de adopción* o *Adoptado*.
- **Eliminar:** botón “Eliminar”, y luego confirma en la misma pantalla.

### Otras pestañas

- **Albergue y contacto:** nombre, subtítulo, descripción, foto de portada, WhatsApp, redes, correo, ubicación y horario.
- **Estadísticas:**
  - Las cifras vacías se muestran como “pendiente de confirmar”.
  - “Automático” cuenta directamente desde el catálogo. Sirve para perritos disponibles, en proceso, adoptados y el total.
- **Datos y almacenamiento:**
  - **Exportar:** copia de seguridad en JSON.
  - **Importar:** carga un respaldo.
  - **Restaurar:** vuelve a los registros iniciales.

### Regla del proyecto

Si un dato no está confirmado, déjalo vacío. La página mostrará “Información pendiente de confirmar”.

La “última vacuna” es la más reciente. **No** es la fecha de la próxima dosis. El campo *Próxima vacuna o control* solo debe llenarse si el veterinario lo indicó.

### Editar sin el panel (opcional)

Puedes cambiar directamente `data/perritos.js` con cualquier editor de texto.

Ojo: esos son solo los datos *iniciales*. Si ya guardaste cambios desde el panel, esos cambios tienen prioridad. Para volver a los datos del archivo, usa **Datos → Restaurar registros iniciales**.

---

## 4. Dónde se guardan los cambios

El sitio elige el modo automáticamente.

| Modo | Cuándo se usa | Alcance |
|---|---|---|
| **Local** (por defecto) | `js/config.js` vacío | Guarda en el `localStorage` de **ese navegador**. ⚠️ **Opción limitada:** los cambios **no** se sincronizan con otros dispositivos ni los ven otras personas, y se pierden si borras los datos del navegador. Fotos subidas: pocas y pequeñas, porque el espacio es de unos 5 MB. No hay contraseña: cualquiera puede abrir el panel en *su propio* navegador, pero solo cambia lo que ve él mismo. |
| **Supabase** (recomendado para publicar) | Llenas `js/config.js` | Base de datos y fotos en línea, compartidas para todos. El panel pide **correo y contraseña**. Solo los administradores autorizados pueden guardar, y eso lo controla la base de datos (RLS), no el navegador. |

Para pasar del modo local a Supabase: **Datos → Exportar**, activas Supabase, y luego **Datos → Importar**.

---

## 5. Activar Supabase (base de datos compartida y gratuita)

1. Crea una cuenta en <https://supabase.com> y luego un **New project**. Anota la contraseña de la base de datos en un lugar seguro. No va en el código.
2. Ve a **SQL Editor → New query**, pega el contenido de `supabase/esquema.sql` y presiona **Run**. Esto crea:
   - las tablas `perritos`, `sitio` y `administradores`,
   - el bucket de fotos `fotos`,
   - las reglas de seguridad: todos pueden leer y solo los administradores pueden escribir.
3. Crea el usuario administrador:
   1. Ve a **Authentication → Users → Add user → Create new user**.
   2. Escribe su correo y una contraseña segura, y marca *Auto Confirm User*.
   3. Copia el **User UID** que aparece en la lista.
   4. En **SQL Editor**, ejecuta (cambiando el UID):
      ```sql
      insert into administradores (user_id) values ('PEGA-AQUI-EL-USER-UID');
      ```
4. Desactiva los registros públicos: **Authentication → Sign In / Providers → Email**, y desactiva *Allow new users to sign up*. Así nadie más puede crearse una cuenta.
5. En **Project Settings → API** (o *API Keys*), copia:
   - **Project URL**,
   - **anon / publishable key**.
6. Pégalos en `js/config.js`:
   ```js
   window.CONFIG_SITIO = { supabase: { url: "https://xxxx.supabase.co", anonKey: "eyJ..." } };
   ```
   La *anon key* es pública por diseño: lo que protege los datos son las reglas RLS del paso 2.
   **Nunca** pegues la *service_role key* ni contraseñas en ningún archivo del sitio.
7. Abre el sitio, entra a **Administrar** e inicia sesión. La base empieza vacía: pulsa **“Cargar los 18 registros iniciales del ZIP”**.

Las fotos iniciales se siguen sirviendo desde la carpeta `fotos/` del sitio. Las fotos nuevas que subas desde el panel se guardan en el bucket `fotos` de Supabase.

---

## 6. Formulario de adopción y WhatsApp

El formulario **no envía nada por sí solo**, porque no hay un servidor de correo configurado. Valida los datos y arma un mensaje con la información del perrito y lo que la persona escribió.

- **Si el número de WhatsApp está configurado:** aparece el botón **Abrir en WhatsApp**, con el mensaje ya escrito. La persona lo envía desde WhatsApp si quiere.
- **Si no está configurado:** se muestra el mensaje con un botón **Copiar**, y un aviso de que el número está pendiente.

**Configurar el número:** **Administrar → Albergue y contacto → Número de WhatsApp**. Escribe el código de país más el número, solo dígitos. Para Perú es `51` seguido de los 9 dígitos del celular.

---

## 7. Publicarlo en internet y compartir el enlace (gratis)

**Netlify Drop (el más fácil)**

1. Entra a <https://app.netlify.com/drop>.
2. Arrastra **esta carpeta completa**.
3. Te da un enlace del tipo `https://nombre.netlify.app`. Crea una cuenta gratuita para que el enlace no caduque y para cambiarle el nombre.
4. Para actualizar el sitio, vuelve a arrastrar la carpeta en *Deploys*.

**GitHub Pages**

1. Crea un repositorio y sube todos los archivos.
2. Ve a **Settings → Pages**, elige *Deploy from a branch* → `main` → `/root`.

**Vercel** también funciona: “Add New Project” → importa la carpeta (no hace falta *build*).

> Si publicas en internet, usa **Supabase**. En modo local, los cambios que hagas en tu navegador no los verá nadie más.

---

## 8. Personalizar el diseño

- **Colores:** al inicio de `css/estilos.css` (variables `--bg`, `--sage`, `--peach`, `--accent`, `--earth`…). Hay paleta clara y oscura.
- **Tipografías:** Fraunces (títulos) y Figtree (texto), de Google Fonts, en el `<head>` de `index.html`.
- **Textos fijos** (título de portada, pasos de adopción): directamente en `index.html`.

---

## 9. Lo que vino en el ZIP y lo que falta

El ZIP traía **18 afiches “¡Busco hogar!”** (17 perritos y 1 gata). Ningún otro archivo tenía información.

**De cada afiche se extrajo:**
- nombre,
- sexo,
- peso,
- tamaño,
- estado de salud (texto literal),
- mes de la última vacuna.

Todos dicen “¡Busco hogar!”, así que se registraron como *Disponible*.

**No venía en el ZIP y queda pendiente de confirmar:**
- edad,
- raza,
- historia,
- nivel de energía,
- compatibilidad con niños, perros y gatos,
- nombre de cada vacuna,
- desparasitación,
- esterilización,
- enfermedades,
- próximos controles,
- número de WhatsApp,
- redes, correo, ubicación y horario del albergue,
- adopciones realizadas y animales que necesitan ayuda.

**Datos por verificar** (también aparecen en la ficha de cada uno):
- **Luna:** es una **gata** (se ve en la foto de su afiche). Está en el catálogo con especie “Gato” y hay un filtro de especie. Su afiche dice tamaño “Mediana” con 3.6 kg: confirmar.
- **Mota:** el archivo se llama `motal.jpg`, pero el afiche dice MOTA.
- **Chispa:** el afiche dice “sano” aunque es hembra (probable error de redacción).
- **Personalidad:** los rasgos (*tranquilo, noble, cariñoso, dulce, juguetón, amoroso, llena de energía, lista para una familia*) salen literalmente de la frase de salud de cada afiche.
- **Destacados:** los perritos “destacados” de la portada son una selección editable, no un dato del albergue.
