# Design: provider-catalog

## Architecture

```
pi-providers/
├── src/
│   ├── catalog.ts          ← load, list, resolve contracts
│   ├── validator.ts        ← validate account limits against contract
│   └── types.ts            ← ProviderContract, ModelSpec, LimitSpec, AuthSpec
├── schemas/
│   └── provider-contract.schema.json   ← JSON Schema for contract files
├── contracts/
│   ├── agnes/
│   │   ├── free-v1.json              ← Free tier, medido 2026-10-10
│   │   ├── tokenplan-v1.json         ← Token Plan, según wiki sep 2026
│   │   └── README.md                 ← Fuentes: URLs de la wiki, fechas de verificación
│   ├── qwen/
│   │   ├── deepseek-v4-flash-v1.json ← Qwen/Alibaba DeepSeek, insufficient_quota
│   │   └── README.md
│   └── _template.json               ← Plantilla para nuevos proveedores
├── tests/
│   ├── catalog.test.ts
│   └── validator.test.ts
└── README.md
```

## Contract structure (v1)

```jsonc
// contracts/agnes/free-v1.json
{
  "contractId": "agnes/free-v1",
  "provider": "agnes",
  "contractType": "free",
  "displayName": "Agnes Free Tier (verified 2026-10-10)",
  "verifiedAt": "2026-10-10T00:00:00Z",
  "supersedes": null,          // "agnes/free-v0" si hubiera existido
  "supersededBy": null,        // "agnes/free-v2" cuando Agnes cambie

  "auth": {
    "method": "api_key",
    "headerName": "Authorization",
    "headerFormat": "Bearer {key}"
  },

  "api": {
    "baseUrl": "https://apihub.agnes-ai.com/v1",
    "chatEndpoint": "/chat/completions",
    "apiType": "openai-completions"
  },

  "models": [
    {
      "id": "agnes-3.0-flash",
      "displayName": "Agnes 3.0 Flash",
      "contextWindow": 512000,
      "maxOutputTokens": 65536,
      "capabilities": ["text", "streaming", "tools"],
      "pricing": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
      "free": true
    },
    {
      "id": "agnes-2.5-flash",
      "displayName": "Agnes 2.5 Flash",
      "contextWindow": 512000,
      "maxOutputTokens": 65536,
      "capabilities": ["text", "streaming", "tools"],
      "pricing": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
      "free": true
    }
    // Pro y Flash Max NO incluidos (no son gratis)
  ],

  "limits": {
    "rpm": 10,                    // 10 RPM efectivos, wiki sep 2026
    "rpmNominal": 30,             // 30 RPM nominal (documentado pero no efectivo)
    "rpd": null,                  // Sin límite diario documentado
    "maxConcurrent": null,        // Sin límite de concurrencia documentado
    "notes": "Límite de 10 RPM verificado empíricamente el 2026-10-10. La wiki dice 10 efectivos (30 nominales). Julio 2026 decía 20 RPM."
  },

  "knownQuirks": {
    "rateHeaders": false,         // Agnes no envía headers de rate limit
    "retryAfter": false,          // No envía Retry-After en 429
    "insufficientQuotaCode": "insufficient_quota",  // Código cuando la cuota se agota
    "streamingRequired": false,
    "notes": "Sin headers de rate limit → la única señal de agotamiento es el 429. La selección least-pressure y la coordinación multi-proceso son esenciales."
  },

  "sources": [
    {
      "url": "https://wiki.agnes-ai.com/en/docs/tokenplan",
      "description": "Token Plan y límites de cuota",
      "verifiedAt": "2026-10-10"
    },
    {
      "url": "https://wiki.agnes-ai.com/en/docs/pricing",
      "description": "Precios oficiales",
      "verifiedAt": "2026-10-10"
    },
    {
      "url": "https://wiki.agnes-ai.com/en/docs/terms-of-service",
      "description": "Términos de servicio §5.4 (rate limiting), §4.1 (credenciales), §8.2 (datos)",
      "verifiedAt": "2026-10-10"
    }
  ]
}
```

## Versioning strategy

Cuando Agnes cambia sus condiciones (ej: de 10 RPM a 5 RPM):

1. Se crea `contracts/agnes/free-v2.json` con los nuevos límites.
2. `free-v1.json` se actualiza: `"supersededBy": "agnes/free-v2"`.
3. `free-v2.json` referencia: `"supersedes": "agnes/free-v1"`.
4. Los usuarios que contrataron bajo v1 siguen referenciando `agnes/free-v1`.
5. Los usuarios nuevos usan `agnes/free-v2`.

**Inmutabilidad**: una vez publicado un contrato, no se modifica (excepto para añadir `supersededBy`). Los cambios son nuevos archivos, no ediciones.

## Cuenta → Contrato

```jsonc
// account-router.json
{
  "accounts": [
    {
      "id": "a",
      "credential": { "env": "AGNES_KEY_1" },
      "providerContract": "agnes/free-v1"   // ← vincula a contrato versionado
    }
  ]
}
```

El validator comprueba:
- El contrato referenciado existe
- El modelo seleccionado está en `contract.models[].id`
- Los límites de la cuenta no exceden los del contrato (ej: `maxConcurrent: 5` cuando el contrato dice `null` → OK; `maxConcurrent: 5` cuando el contrato dice `2` → ERROR)

## Catálogo de proveedores actuales

| Proveedor | Contrato | Modelos | Límite | Quirk |
|-----------|----------|---------|--------|-------|
| Agnes | `free-v1` | 3.0-flash, 2.5-flash | 10 RPM efectivos | Sin rate headers |
| Agnes | `tokenplan-v1` | 3.0-pro, flash-max, ... | 30 RPM, 5h/sem | Por crear (sin acceso real) |
| Qwen/Alibaba | `deepseek-v4-flash-v1` | deepseek-v4-flash-0731 | Documentado como "allocated quota" | `insufficient_quota` code |
| Qwen/Alibaba | `deepseek-v4-pro-v1` | deepseek-v4-pro | Por determinar | Sin acceso real a PRO |

## Fuentes vivas

Cada contrato referencia sus fuentes con URLs + fechas de verificación. Un script `pi-providers/scripts/check-sources.sh` puede verificar periódicamente si las URLs siguen activas (200 vs 404) y si el contenido ha cambiado (hash del body), generando un informe de "fuentes posiblemente desactualizadas".
