# Vizail Integration Guide

This document describes how **Vizail** (and other downstream consumers) integrate with the Kulrs API to browse palettes, generate color schemes, and surface community content.

---

## Table of Contents

1. [Overview](#overview)
2. [Base URL](#base-url)
3. [Authentication](#authentication)
4. [CORS](#cors)
5. [Rate Limiting](#rate-limiting)
6. [Endpoints](#endpoints)
   - [Browse & Discovery](#browse--discovery)
   - [Generation](#generation)
   - [Social](#social)
7. [Error Responses](#error-responses)
8. [HTTP Caching](#http-caching)
9. [Integration Checklist](#integration-checklist)

---

## Overview

Kulrs exposes a REST API built on Express and deployed as a Google Cloud Function.  Vizail consumes this API to:

- Display community palettes in its UI
- Offer server-side palette generation from colors, moods, and images
- Allow users to like and save palettes they discover through Vizail

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Production  | `https://api.kulrs.com` |
| Staging     | `https://api-staging.kulrs.com` |
| Local dev   | `http://localhost:8080` |

All endpoints are relative to the base URL.

---

## Authentication

Kulrs uses **Firebase Authentication** ID tokens for protected endpoints.

### Obtaining a Token

1. Sign the user in with the Firebase client SDK (web or Flutter).
2. Call `user.getIdToken()` to retrieve a short-lived JWT (≈ 1 hour TTL).
3. Attach it to every request as a Bearer header:

```
Authorization: Bearer <idToken>
```

### Anonymous Access

Some endpoints support anonymous users via a stable `deviceId` (alphanumeric + hyphens/underscores, max 128 characters).  Where applicable, pass `deviceId` in the request body or query string.  The API will create an anonymous user record the first time it sees a given `deviceId`.

### Auth Levels

| Level | Description |
|-------|-------------|
| `required` | `Authorization: Bearer <token>` must be valid |
| `optional` | Token enhances the response (e.g. per-palette like status) but is not required |
| `anonymous` | Bearer token **or** `deviceId` accepted |
| `none` | No auth needed |

---

## CORS

The API allows cross-origin requests from the following origins:

| Environment | Allowed Origins |
|-------------|-----------------|
| Production  | `https://kulrs.com`, `https://www.kulrs.com`, `https://vizail.com` |
| Development | `http://localhost:5173`, `http://localhost:5174` |

To add a custom origin (e.g. a staging Vizail domain), set the `CORS_ORIGIN` environment variable to a comma-separated list of origins on the API deployment.

Preflight (`OPTIONS`) requests receive a `204` response with a `Access-Control-Max-Age: 86400` cache header.

---

## Rate Limiting

Two tiers apply per IP address:

| Tier | Limit | Applied To |
|------|-------|-----------|
| General | 100 req / 60 s | All routes |
| Write | 20 req / 60 s | `POST`, `PUT`, `DELETE` palette routes; all `/generate` routes |

When a limit is exceeded the API returns `429` with:

```json
{
  "error": "Too many requests",
  "message": "Please try again later"
}
```

Standard `RateLimit-*` headers are included in every response.

---

## Endpoints

### Browse & Discovery

#### `GET /palettes`

Browse public palettes with optional filtering and sorting.

**Auth**: optional

**Query parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sort` | `recent` \| `popular` \| `trending` | `recent` | Sort order. `trending` applies a time-decay score: `likesCount / (ageHours + 2)^1.5` |
| `limit` | integer 1–50 | `20` | Page size |
| `offset` | integer 0–10 000 | `0` | Pagination offset |
| `userId` | string | — | Filter palettes by creator UUID |
| `tags` | comma-separated slugs | — | Keep only palettes with at least one matching tag (e.g. `warm,vibrant`) |
| `q` | string ≤ 100 chars | — | Case-insensitive text search across palette name and description |
| `deviceId` | string | — | Anonymous viewer identifier for per-palette `userLiked` status |

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ocean Breeze",
      "description": "Cool ocean colors",
      "userId": "uuid",
      "isPublic": true,
      "likesCount": 12,
      "savesCount": 3,
      "createdAt": "2025-06-01T12:00:00.000Z",
      "colors": [
        { "id": "uuid", "hexValue": "#0077BE", "position": 0, "name": "Deep Blue" }
      ],
      "userLiked": false
    }
  ]
}
```

**Degraded mode**: If a transient DB failure occurs the response body will still be `200` with `"data": []` and the header `X-Degraded: true`.

---

#### `GET /palettes/tags`

Return all available tags.

**Auth**: none

**Response `200`**

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Cool", "slug": "cool", "description": "Cool tones" }
  ]
}
```

Tags are cached server-side for 5 minutes and the response carries `Cache-Control: public, max-age=300, stale-while-revalidate=600`.

---

#### `GET /palettes/:id`

Get a single palette.  Private palettes are only returned to their owner.

**Auth**: optional

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Ocean Breeze",
    "isOwner": false,
    "colors": [ ... ]
  }
}
```

---

#### `GET /palettes/:id/related`

Return palettes that share tags with the given palette.  Falls back to most-popular public palettes when the source has no tags.

**Auth**: optional

**Query parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer 1–20 | `6` | Maximum results |

**Response `200`** – same shape as `GET /palettes` items.

`Cache-Control: public, max-age=30, stale-while-revalidate=60`

---

#### `GET /palettes/:id/likes`

Get like count and viewer's like status.

**Auth**: optional (authenticated / `deviceId` for `userLiked`)

**Response `200`**

```json
{
  "success": true,
  "data": { "likesCount": 12, "userLiked": true }
}
```

---

### Generation

All generation endpoints require authentication.

#### `POST /generate/color`

Generate a palette from one or more OKLCH seed colors.

**Body**

```json
{
  "color":  { "l": 0.6, "c": 0.2, "h": 220 },
  "colorCount": 5
}
```

Or pass multiple seeds:

```json
{
  "colors": [
    { "l": 0.6, "c": 0.2, "h": 220 },
    { "l": 0.4, "c": 0.15, "h": 30 }
  ],
  "colorCount": 5
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "colors": [
      { "role": "primary", "color": { "l": 0.6, "c": 0.2, "h": 220 } }
    ],
    "metadata": {
      "generator": "color",
      "explanation": "...",
      "timestamp": "2025-06-01T12:00:00.000Z",
      "tags": ["cool", "calm"],
      "confidence": 0.87,
      "roleHints": { "primary": "dominant hue" }
    }
  }
}
```

---

#### `POST /generate/color/related`

Return harmonic relationships for a single color (complementary, analogous, triadic, split-complementary, neutral).

**Body**

```json
{ "color": { "l": 0.6, "c": 0.2, "h": 220 } }
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "source": { "l": 0.6, "c": 0.2, "h": 220 },
    "relationships": [
      {
        "type": "complementary",
        "label": "Complementary",
        "description": "Opposite on the color wheel",
        "colors": [ { "l": 0.6, "c": 0.2, "h": 40 } ]
      }
    ]
  }
}
```

---

#### `POST /generate/color/suggestions`

Return ranked palette suggestions derived from a seed color using multiple harmony strategies.

**Body**

```json
{
  "color": { "l": 0.6, "c": 0.2, "h": 220 },
  "colorCount": 5,
  "count": 4
}
```

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "harmony": "analogous",
      "score": 0.92,
      "tags": ["calm", "cool"],
      "palette": { "colors": [ ... ], "metadata": { ... } }
    }
  ]
}
```

---

#### `POST /generate/mood`

Generate a palette from free-text mood description.  Results are deterministic: the same `mood` always produces the same palette (seeded by a hash of the mood string).

**Body**

```json
{
  "mood": "calm ocean at sunrise",
  "seed": 42,
  "colorCount": 5
}
```

`seed` is optional; defaults to a hash of `mood`.

---

#### `POST /generate/image`

Generate a palette from image pixel data (max 10 000 pixels).

**Body**

```json
{
  "pixels": [
    { "r": 255, "g": 100, "b": 50 },
    { "r": 50, "g": 100, "b": 200 }
  ],
  "colorCount": 5
}
```

---

### Social

#### `POST /palettes/:id/like`

Like a palette.  Idempotent.

**Auth**: anonymous (`req.user` or `deviceId` in body)

**Body** (when unauthenticated)

```json
{ "deviceId": "visitor-abc-123" }
```

**Response `200`**

```json
{
  "success": true,
  "data": { "alreadyLiked": false, "likesCount": 13 }
}
```

---

#### `DELETE /palettes/:id/like`

Remove a like.  Same auth rules as `POST /like`.

**Response `200`**

```json
{
  "success": true,
  "data": { "wasLiked": true, "likesCount": 12 }
}
```

---

#### `POST /palettes/:id/save`

Bookmark a palette.  Auth required.

**Response `200`**

```json
{
  "success": true,
  "data": { "alreadySaved": false }
}
```

---

## Error Responses

All errors share a consistent shape:

```json
{
  "error": "Human-readable message",
  "details": [ ... ]
}
```

`details` is only present on `400 Validation failed` responses and contains the Zod issue array.

| Status | Meaning |
|--------|---------|
| `400` | Bad request – invalid input or malformed palette ID |
| `401` | Unauthorized – missing or invalid Firebase token |
| `403` | Forbidden |
| `404` | Not found |
| `409` | Conflict |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

---

## HTTP Caching

Leverage these response headers to reduce client-side latency:

| Endpoint | `Cache-Control` |
|----------|----------------|
| `GET /palettes` | `public, max-age=15, stale-while-revalidate=30` |
| `GET /palettes/tags` | `public, max-age=300, stale-while-revalidate=600` |
| `GET /palettes/:id/related` | `public, max-age=30, stale-while-revalidate=60` |

Put a CDN (Cloudflare, Cloud CDN, Fastly) in front of the API to serve these cached responses at the edge without hitting the origin.  See [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) for the recommended CDN configuration.

---

## Integration Checklist

Use this checklist when connecting Vizail to a new Kulrs environment:

- [ ] Confirm the Kulrs API base URL for the target environment
- [ ] Add `https://vizail.com` (or the staging Vizail origin) to `CORS_ORIGIN` on the API deployment
- [ ] Create a Firebase project and configure the Vizail client SDK with `apiKey`, `authDomain`, and `projectId`
- [ ] Verify that `user.getIdToken()` returns a valid token that passes `GET /palettes/my` (expect `200`)
- [ ] Implement token refresh: call `getIdToken(/* forceRefresh */ true)` on `auth/id-token-changed` and before any authenticated request that returns `401`
- [ ] Test anonymous liking end-to-end with a stable `deviceId` (e.g. generated once and stored in `localStorage`)
- [ ] Verify `sort=trending` returns results ordered with recent high-engagement palettes first
- [ ] Confirm rate limit headers (`RateLimit-Limit`, `RateLimit-Remaining`) appear in responses and that the Vizail UI handles `429` gracefully (back-off + user-facing message)
- [ ] Set up CDN caching for `GET /palettes` and `GET /palettes/tags` to serve repeat requests without hitting the origin
