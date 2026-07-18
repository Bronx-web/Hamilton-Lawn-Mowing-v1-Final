# Live Google Reviews — Setup Guide

Turns the homepage reviews carousel into **live Google reviews** that update
automatically. Until you finish this, the site safely shows the 3 hardcoded
fallback reviews — nothing breaks.

There are **3 values** to obtain and **2 places** to paste them.

---

## The 3 values you need

| Value | Where it goes | Secret? |
|-------|---------------|---------|
| `GOOGLE_PLACES_API_KEY` | Apps Script → Script Properties | **YES — never in HTML** |
| `GOOGLE_PLACE_ID` | Apps Script → Script Properties | no (but keep it there too) |
| `GOOGLE_SCRIPT_WEBAPP_URL` | `index.html` const | no (public endpoint) |

Track them in your local `.env` (git-ignored) as you collect them.

---

## Step 1 — Get a Google Places API key

1. Go to https://console.cloud.google.com/
2. Create / pick a project.
3. APIs & Services → Library → search "places" → enable **Places API (New)**
   (the "200 million places" card — NOT the classic "Places API"). The server
   code below uses the New API endpoint.
4. APIs & Services → Credentials → **Create credentials → API key**.
5. **Restrict the key** (important): API restrictions → **Restrict key** →
   tick **Places API (New)** only. Application restriction can stay "None"
   because the key is only ever used server-side inside Apps Script (never
   exposed to browsers).
6. Copy the key → store it in **Apps Script → Script Properties** as
   `GOOGLE_PLACES_API_KEY` (Step 4). Do NOT paste it into any `.html` file or
   into chat. Rotate the key if it is ever exposed.

## Step 2 — Get your Place ID

1. Open https://developers.google.com/maps/documentation/places/web-service/place-id
2. Search "Hamilton Lawn Mowing" (or your business).
3. Copy the Place ID (looks like `ChIJ...`) → `.env` as `GOOGLE_PLACE_ID`.

## Step 3 — Add the server code to your existing Apps Script

You already have the Apps Script bound to SHEET_ID `1EXNYMWiJK8...` (the promo
form handler). Open that same script editor and **append** the function below.
Do NOT remove your existing `doPost` / form code.

> If your script already has a `doGet`, merge the body in rather than adding a
> second `doGet` (a file can only have one).

```javascript
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getReviews') {
    return ContentService
      .createTextOutput(JSON.stringify(getFilteredGoogleReviews()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // default response for any other GET
  return ContentService.createTextOutput('OK');
}

// Uses Places API (New) — endpoint places.googleapis.com/v1/places/{id}
function getFilteredGoogleReviews() {
  const props    = PropertiesService.getScriptProperties();
  const apiKey   = props.getProperty('GOOGLE_PLACES_API_KEY');
  const placeId  = props.getProperty('GOOGLE_PLACE_ID');
  if (!apiKey || !placeId) return [];

  // Cache for 6 hours to protect your Places API quota.
  const cache  = CacheService.getScriptCache();
  const cached = cache.get('reviews_json');
  if (cached) return JSON.parse(cached);

  const url = 'https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId);

  const options = {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'X-Goog-Api-Key': apiKey,
      // Only request the reviews field — keeps cost/quota minimal.
      'X-Goog-FieldMask': 'reviews'
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const json     = JSON.parse(response.getContentText());
    const raw      = json.reviews || [];

    // Only 4- and 5-star reviews. Normalise New-API shape to the flat
    // shape the website expects.
    const premium = raw
      .filter(function (r) { return (r.rating || 0) >= 4; })
      .map(function (r) {
        return {
          author_name: (r.authorAttribution && r.authorAttribution.displayName) || 'Google review',
          rating: r.rating,
          relative_time_description: r.relativePublishTimeDescription || '',
          text: (r.text && r.text.text) || (r.originalText && r.originalText.text) || ''
        };
      });

    cache.put('reviews_json', JSON.stringify(premium), 21600); // 6h
    return premium;
  } catch (err) {
    return [];
  }
}
```

> **Note:** Places API (New) returns at most **5 reviews** and does not let you
> sort by newest — Google picks "most relevant". That is fine for a homepage
> carousel.

## Step 4 — Store the secrets in Script Properties

In the Apps Script editor:
1. ⚙️ **Project Settings** → scroll to **Script Properties**.
2. Add property `GOOGLE_PLACES_API_KEY` = your key.
3. Add property `GOOGLE_PLACE_ID` = your Place ID.
4. Save.

## Step 5 — Deploy as Web App

1. **Deploy → New deployment** → type **Web app**.
2. Execute as: **Me**. Who has access: **Anyone**.
3. Deploy → copy the **Web app URL** (ends in `/exec`).
4. Paste into `.env` as `GOOGLE_SCRIPT_WEBAPP_URL`.

> Reusing an existing deployment? Use **Manage deployments → Edit → New version**
> so the URL stays the same.

## Step 6 — Wire the frontend

1. Open `index.html`.
2. Find:
   ```js
   const GOOGLE_SCRIPT_WEBAPP_URL = "";
   ```
   (in the REVIEWS CAROUSEL SCRIPT block near the bottom)
3. Paste your `/exec` URL between the quotes. Save.

## Step 7 — Test

1. Open the Web App URL directly with `?action=getReviews` on the end:
   `https://script.google.com/macros/s/XXXX/exec?action=getReviews`
   → should return a JSON array of reviews (or `[]` if none yet).
2. Open `index.html` locally, check the carousel populates from live data.
3. If anything is off, the carousel falls back to the 3 hardcoded reviews —
   it will never go blank.

---

## Safety notes

- The API key lives **only** in Script Properties (server-side). It is never in
  the repo or the browser. Do not paste it into any `.html` file.
- The Web App URL is safe to be public — it only returns filtered review JSON.
- `.env` is git-ignored; real keys never get pushed to GitHub.
