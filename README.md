# Para ti 💛

Una experiencia romántica interactiva de cinco etapas, diseñada primero para teléfonos Android y también para iPhone y escritorio. El frontend usa HTML, CSS y módulos de JavaScript sin framework; FastAPI sirve la página y guarda las respuestas en SQLite.

## Requisitos

- Python 3.10 o superior
- Un navegador moderno con soporte para módulos ES, Canvas y Pointer Events

## Preparación

En PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

En macOS o Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Ejecutar

Desde la raíz del proyecto:

```bash
python -m uvicorn backend.main:app --reload
```

Abre `http://127.0.0.1:8000`. La API responde en `/api/health`, acepta `POST /api/wishes` y genera el PDF de la carta con `POST /api/letter.pdf`. Las respuestas y el mensaje se guardan en `backend/storage/wishes.sqlite3`. Puedes cambiar la ruta con `WISHES_DB_PATH`.

### Recibir el mensaje por correo desde esta computadora

Sí funciona con la web local mientras la computadora tenga conexión a Internet y el servidor siga abierto. El destino ya está configurado como `akane8264@gmail.com`. Para enviar desde esa cuenta Gmail, activa la [verificación en dos pasos](https://support.google.com/accounts/answer/185839) y crea una [contraseña de aplicación](https://support.google.com/accounts/answer/185833). Usa esa contraseña de 16 caracteres, no la contraseña habitual de Gmail.

En PowerShell, detén el servidor que tengas abierto y ejecuta:

```powershell
.\start-with-email.ps1
```

El script pide la contraseña de aplicación sin mostrarla y la mantiene solo en el proceso del servidor. Si el remitente es otra cuenta, usa `.\start-with-email.ps1 -Sender otra-cuenta@gmail.com`. En Gmail, el envío usa `smtp.gmail.com` con SSL en el puerto 465. Al guardar las respuestas, el mensaje queda en SQLite y el servidor intenta enviarlo por correo. El estado del correo se guarda en la columna `email_status` de la base de datos; la web y la respuesta de la API no se lo muestran a Sebastián. Sin contraseña de aplicación, el mensaje queda guardado localmente, pero no llega al correo.

### Publicar en Render durante 24 horas

El archivo `render.yaml` prepara un **Web Service Free** y una base **Postgres Free**. Se usa Postgres porque [Render borra los archivos locales, incluido SQLite, al suspender o reiniciar un servicio gratuito](https://render.com/docs/free). En ese plan [también están bloqueados los puertos SMTP 25, 465 y 587](https://render.com/docs/free), por lo que el correo se envía mediante la API HTTPS de Resend.

1. Sube el proyecto a un **repositorio privado de GitHub**. La carpeta `.venv`, la base SQLite y los originales de `fotos/` y `canciones/` quedan excluidos por `.gitignore`; las seis fotos y seis canciones que usa la web sí están en `frontend/assets/` y deben subirse. No subas claves ni contraseñas.
2. Crea una cuenta de [Resend](https://resend.com/) con el correo que recibirá el mensaje. En **API Keys**, crea una clave con permiso **Sending access** y guárdala para el paso siguiente. El remitente de prueba configurado es `onboarding@resend.dev`; comprueba con un envío real que llega al correo elegido. Para otros destinatarios, Resend puede requerir un dominio de envío verificado.
3. En Render elige **New → Blueprint**, conecta ese repositorio y selecciona `render.yaml`. Durante la creación completa las tres variables privadas que te pedirá:

   | Variable | Valor |
   | --- | --- |
   | `WISHES_EMAIL_TO` | Tu dirección de correo, por ejemplo `akane8264@gmail.com` |
   | `RESEND_API_KEY` | La clave privada `re_...` de Resend |
   | `GIFT_START_AT` | Fecha y hora de inicio con zona horaria, por ejemplo `2026-10-07T18:00:00-06:00` |

4. Espera a que el servicio indique **Live**. El enlace se abre automáticamente al llegar `GIFT_START_AT` y deja de mostrar la web **24 horas después**. `/api/health` sigue disponible para la verificación de Render. Antes de compartir el enlace, prueba el formulario y confirma que el mensaje llegó al buzón de Gmail. Si el envío falla, la web no confirmará el guardado y el mensaje queda registrado en Postgres para revisarlo.
5. Al terminar el regalo, borra el servicio y la base de datos desde Render si ya no necesitas conservarlos. El cierre de 24 horas oculta la web, pero no elimina los recursos por sí mismo.

El servicio Free puede tardar alrededor de un minuto en responder a la primera visita tras suspenderse. [Render documenta la suspensión a los 15 minutos de inactividad](https://render.com/docs/free). La base Postgres Free conserva los mensajes durante el día del regalo; [Render indica que las bases gratuitas expiran a los 30 días](https://render.com/docs/free).

### Abrirla en un Android de la misma red

Inicia el servidor con `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000`. Conecta el teléfono y la computadora a la misma red Wi-Fi y abre `http://IP_DE_TU_COMPUTADORA:8000` en Chrome para Android. En Windows, `ipconfig` muestra la dirección IPv4 local. Si no carga, permite el puerto 8000 en el firewall. Para compartirla por Internet se necesita desplegar el servidor FastAPI en un servicio de hosting.

## Tests

```bash
python -m pytest
```

## Personalizar

| Contenido | Archivo |
| --- | --- |
| Carta y mensaje final | `frontend/js/data/config.js` |
| Seis canciones, artistas, dedicatorias, audios y enlaces de Spotify | `frontend/js/data/songs.js` (solo faltan las dedicatorias, si las quieres) |
| Letras de las seis canciones | `frontend/js/data/lyrics.js` |
| Frases destacadas junto al reproductor | `frontend/js/data/featuredVerses.js` |
| Fotos propias para las canciones | `frontend/assets/photos/song-1.jpg` a `song-6.jpg` |
| Audios de las canciones | `frontend/assets/audio/song-1.mp3` a `song-6.mp3` |
| Tres mensajes de rasca y descubre | `frontend/js/data/messages.js`, `scratchMessages` |
| Treinta y una razones del juego | `frontend/js/data/messages.js`, `heartReasons` |

La carta, el mensaje final, los mensajes del rasca, las 31 razones y los seis enlaces de Spotify ya están incorporados. Las seis fotos de `fotos/` se copiaron a `frontend/assets/photos/` en orden de incorporación: la foto de las 8:36:23, `llp.jpeg`, la de las 8:36:24, `njk.jpeg`, la de las 8:37:42 y la de las 9:01:21. `song-4.jpg` se gira 90° en la tarjeta porque el archivo original está de lado. Los originales permanecen en `fotos/`.

Los seis MP3 de `canciones/` se copiaron a `frontend/assets/audio/` en el mismo orden que las tarjetas. Al tocar una tarjeta, la canción se reproduce en la página; los controles permiten pausar, pasar de canción y buscar un momento con mouse, teclado o dedo. El disco y las barras se animan mientras suena. La letra siempre está visible en la misma tarjeta; por ahora se puede desplazar manualmente porque las letras aún no tienen tiempos. Cada entrada de `frontend/js/data/lyrics.js` puede convertirse en una lista de objetos `{ start, end, text, highlight }` para activar la sincronización y destacar frases elegidas. Las dedicatorias se toman de `frontend/js/data/songs.js` y actualmente están vacías. El reproductor conserva un enlace independiente a Spotify. Al avanzar a la siguiente actividad, el audio se detiene. Los archivos originales permanecen en `canciones/`.

## Estructura

- `backend/api`: rutas HTTP y health check.
- `backend/schemas`: validación Pydantic.
- `backend/services`: casos de uso.
- `backend/storage`: acceso a SQLite.
- `frontend/js/core`: controlador de etapas, pantalla y eventos.
- `frontend/js/activities`: una clase por actividad con `init`, `start`, `complete` y `destroy`.
- `frontend/js/data`: contenido personalizable.
- `frontend/js/effects`: efecto final de Canvas y sacudida.
- `frontend/css`: tokens, base, layout y estilos por actividad.
- `tests`: pruebas de la API con una base temporal.

El progreso de etapa se conserva solo en `sessionStorage`. Las respuestas privadas viven en memoria hasta enviarse; tras guardarse se borran de la instancia de la actividad. No hay pantalla pública para consultar respuestas ni CORS abierto.

Al terminar, **Volver a empezar 💛** reinicia el recorrido desde el sobre y reinicia el progreso de la sesión. Las respuestas que ya se enviaron permanecen guardadas en SQLite; cada nueva vuelta permite contestar otra vez.
