# Lost & Found — Web

Frontend de la plataforma Lost & Found. Consume la API de [lost-and-found-api](../lost-and-found-api).

## Stack
- React 19 + TypeScript, Vite
- React Router + TanStack Query
- Tailwind CSS v4 (tokens en `src/index.css`)
- MapLibre con estilos vectoriales de OpenFreeMap (datos de OpenStreetMap, sin API key)
- lucide-react, Instrument Sans + Geist Mono

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:5173
```

Vite reenvía `/api` a `http://localhost:3000`, así que solo hace falta tener la API corriendo. Para apuntar a otra API, definí `VITE_API_URL` (ver `.env.example`).

## Estado

| Parte | Fuente |
| --- | --- |
| Registro, login, sesión, perfil | API real (`/auth`, `/users/me`) |
| Feed, detalle, publicar, coincidencias, reclamos | Mock en `src/features/posts/posts-api.ts` |

El mock respeta el modelo de `docs/ARCHITECTURE.md` de la API. Para pasar a la API real se reemplaza el cuerpo de cada función de `posts-api.ts` por una llamada a `api()`, sin tocar las páginas.

## Sesión
El access token vive en memoria y el refresh token en `localStorage`. Como la API rota el refresh token y revoca la familia si ve uno reutilizado, los refresh se deduplican en la pestaña y se serializan entre pestañas con Web Locks (`src/lib/api-client.ts`).

## Diseño
La dirección visual sigue [unslop](https://heydamir.design/unslop) de Damir Sokolovsky (@heydamir), CC BY 4.0: superficies neutras, un acento cobalto y el color puesto en las zonas del mapa. La firma del producto es el círculo punteado de "zona aproximada", porque la ubicación exacta nunca se publica.
