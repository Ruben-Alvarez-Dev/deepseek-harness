# Design: model-catalog

## Architecture

```
pi-models/
├── src/
│   ├── catalog.ts          ← load, list, query, resolve model specs
│   └── types.ts            ← ModelCard, Capabilities, Pricing, ParameterRange
├── schemas/
│   └── model-card.schema.json   ← JSON Schema for model card files
├── models/
│   ├── agnes/
│   │   ├── agnes-3.0-flash-v1.json
│   │   ├── agnes-2.5-flash-v1.json
│   │   └── agnes-3.0-flash-max-v1.json  (si se añade al catálogo)
│   ├── deepseek/
│   │   ├── deepseek-v4-flash-0731-v1.json
│   │   └── deepseek-v4-pro-v1.json
│   └── _template.json
├── scripts/
│   ├── import-huggingface.ts      ← TS script: HF API → model card JSON
│   └── verify-sources.sh          ← check URLs still alive, content hashes
├── tests/
│   └── catalog.test.ts
└── README.md
```

## Model card structure (v1)

```jsonc
// models/agnes/agnes-3.0-flash-v1.json
{
  "modelId": "agnes-3.0-flash",
  "version": "v1",
  "provider": "agnes",
  "displayName": "Agnes 3.0 Flash",
  "verifiedAt": "2026-10-10T00:00:00Z",

  "architecture": {
    "type": "dense",           // dense | moe | unknown
    "totalParams": null,       // Agnes no publica parámetros exactos
    "activeParams": null,
    "trainingCutoff": null     // Fecha de corte de entrenamiento si se conoce
  },

  "capabilities": {
    "input": ["text"],         // text | image_url | image_base64 | audio | video
    "output": ["text"],
    "streaming": true,
    "tools": true,
    "structuredOutput": true,  // JSON mode / function calling
    "parallelToolCalls": true,
    "vision": false,           // Agnes Flash no tiene visión documentada
    "audio": false,
    "reasoning": false,        // No tiene thinking/reasoning tokens
    "promptCaching": false     // No tiene cache-aware pricing
  },

  "context": {
    "maxInput": 512000,        // tokens — documento oficial
    "maxOutput": 65536,        // tokens — documento oficial
    "maxTotal": null,          // input+output combinado si aplica
    "notes": "Cifras documentadas en wiki, no verificadas con pruebas de tamaño real."
  },

  "pricing": {
    "input": 0,
    "output": 0,
    "cacheRead": 0,
    "cacheWrite": 0,
    "currency": "USD",
    "notes": "Precios publicados de la página oficial. Verificar facturación real."
  },

  "parameters": {
    "api": {
      "temperature": { "min": 0, "max": 2, "default": 1 },
      "topP": { "min": 0, "max": 1, "default": 1 },
      "frequencyPenalty": null,
      "presencePenalty": null,
      "stop": { "maxSequences": 4, "maxSequenceLength": null },
      "notes": "Parámetros estándar OpenAI-compatible."
    },
    "engine": {
      "llamaCpp": {
        "flags": {
          "--ctx-size": { "type": "number", "default": 512, "min": 1, "max": null, "description": "Context size in tokens" },
          "--threads": { "type": "number", "default": "auto", "min": 1, "max": null, "description": "CPU threads for inference" },
          "--n-gpu-layers": { "type": "number", "default": 0, "min": 0, "max": null, "description": "Layers offloaded to GPU (-1 = all)" },
          "--temp": { "type": "number", "default": 0.8, "min": 0, "max": 2, "description": "Temperature" },
          "--top-k": { "type": "number", "default": 40, "min": 1, "max": null, "description": "Top-k sampling" },
          "--top-p": { "type": "number", "default": 0.95, "min": 0, "max": 1, "description": "Top-p sampling" },
          "--repeat-penalty": { "type": "number", "default": 1.1, "min": 1, "max": null, "description": "Repeat penalty" },
          "--seed": { "type": "number", "default": -1, "min": -1, "max": null, "description": "RNG seed (-1 = random)" },
          "--batch-size": { "type": "number", "default": 512, "min": 1, "max": null, "description": "Batch size for prompt processing" },
          "--ubatch-size": { "type": "number", "default": 512, "min": 1, "max": null, "description": "Micro-batch size" },
          "--flash-attn": { "type": "boolean", "default": false, "description": "Enable flash attention" },
          "--mlock": { "type": "boolean", "default": false, "description": "Force system to keep model in RAM" },
          "--no-mmap": { "type": "boolean", "default": false, "description": "Do not memory-map model" }
        },
        "notes": "Flags de llama.cpp. Los valores por defecto varían según la compilación y versión. Documentar la versión exacta usada."
      },
      "vllm": {
        "flags": {
          "--max-model-len": { "type": "number", "description": "Max context length" },
          "--tensor-parallel-size": { "type": "number", "default": 1, "description": "Number of GPUs" },
          "--gpu-memory-utilization": { "type": "number", "default": 0.9, "min": 0, "max": 1 }
        }
      },
      "ollama": {
        "flags": {
          "num_ctx": { "type": "number", "default": 2048, "description": "Context window size" },
          "num_gpu": { "type": "number", "default": "auto", "description": "GPU layers" },
          "num_thread": { "type": "number", "default": "auto", "description": "CPU threads" }
        }
      },
      "transformers": {
        "flags": {
          "device_map": { "type": "string", "default": "auto", "description": "Device placement" },
          "torch_dtype": { "type": "string", "default": "auto", "enum": ["auto", "float16", "bfloat16", "float32"] },
          "load_in_4bit": { "type": "boolean", "default": false },
          "load_in_8bit": { "type": "boolean", "default": false }
        }
      }
    },
    "notes": "Sección `engine` cubre parámetros de motores de inferencia locales. Sección `api` cubre parámetros de APIs remotas. Si el modelo solo se usa vía API, engine está vacío ({})."
  },

  "quirks": {
    "thinkingTokens": false,        // No soporta reasoning/thinking
    "tokenCountingDiffers": null,   // Si el conteo de tokens no coincide con tiktoken
    "streamingOddities": null,      // Comportamiento anómalo en SSE
    "toolCallFormat": "openai",     // Formato de tool calls
    "notes": "Agnes 3.0 Flash sigue el formato OpenAI estándar para chat completions y tool calls."
  },

  "references": {
    "huggingface": null,            // ID en HF Hub si existe
    "officialDocs": "https://wiki.agnes-ai.com/en/docs/agnes-30-flash",
    "apiReference": "https://wiki.agnes-ai.com/en/docs/quickstart",
    "providerModelId": "agnes-3.0-flash"  // ID que usa el proveedor en la API
  },

  "sources": [
    {
      "url": "https://wiki.agnes-ai.com/en/docs/agnes-30-flash",
      "description": "Página oficial del modelo",
      "verifiedAt": "2026-10-10"
    }
  ]
}
```

## Integración con HuggingFace

Script `scripts/import-huggingface.ts`:

```
1. Dado un repo_id de HF ("AgnesAI-Labs/Agnes-3.0-Flash")
2. GET https://huggingface.co/api/models/{repo_id}
3. Extraer: pipeline_tag, config (context_length, model_type), siblings (files)
4. Generar model-card.json con campos mapeados
5. Marcar campos no extraíbles como null + nota "pendiente verificación manual"
6. Guardar en models/ con versión automática
```

Mapeo HF → ModelCard:
| Campo HF | Campo nuestro | Nota |
|----------|---------------|------|
| `id` | `references.huggingface` | Repo ID completo |
| `pipeline_tag` | `architecture.type` (aprox) | text-generation→dense, text-to-text, etc. |
| `config.max_position_embeddings` | `context.maxInput` | Si está disponible |
| `siblings` (lista de archivos) | Metadatos | Para detectar si tiene safetensors, GGUF, etc. |
| `cardData` | Multiples campos | Si la model card YAML tiene structured data |
| `likes`, `downloads` | `popularity` | Métricas de comunidad |
| `tags` | `capabilities` (aprox) | Ej: `transformers`, `pytorch`, `text-generation` |

## Referencia desde provider-catalog

```jsonc
// contracts/agnes/free-v1.json
{
  "models": [
    { "ref": "agnes-3.0-flash@v1", "alias": "agnes-3.0-flash" }
  ]
}
```

El `@v1` es opcional — si se omite, se usa la última versión del modelo.
El `alias` permite que el contrato use un nombre distinto al modelId (útil si el proveedor renombra modelos).

## Versionado

Mismo principio que provider-catalog:
- Los modelos se versionan (`v1`, `v2`, ...)
- Cambios en specs → nuevo archivo, no edición del existente
- `supersededBy` / `supersedes` para trazabilidad
- Si Agnes aumenta el contexto de 512K a 1M → `agnes-3.0-flash-v2.json`