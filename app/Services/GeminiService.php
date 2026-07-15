<?php

namespace App\Services;

use App\Models\AiGlobalContext;
use App\Models\ContentPiece;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiService
{
    private string $apiKey;
    private string $model;
    private string $endpoint;

    public function __construct()
    {
        $this->apiKey   = config('services.gemini.api_key') ?? '';
        $this->model    = config('services.gemini.model') ?? 'gemini-2.0-flash';
        $this->endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent";
    }

    public function generateCopy(ContentPiece $piece): array
    {
        $brandContext = $this->getBrandContext($piece);
        $systemInstruction = $this->buildSystemInstruction($brandContext);
        $userPrompt = $this->buildUserPrompt($piece);

        $response = Http::timeout(30)->post("{$this->endpoint}?key={$this->apiKey}", [
            'system_instruction' => [
                'parts' => [['text' => $systemInstruction]],
            ],
            'contents' => [
                ['role' => 'user', 'parts' => [['text' => $userPrompt]]],
            ],
            'generationConfig' => [
                'temperature'     => 0.85,
                'topP'            => 0.95,
                'maxOutputTokens' => 1024,
                'responseMimeType'=> 'application/json',
            ],
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Error al conectar con Gemini: '.$response->status());
        }

        $raw = $response->json('candidates.0.content.parts.0.text', '');

        return $this->parseResponse($raw);
    }

    private function getBrandContext(ContentPiece $piece): string
    {
        $global   = AiGlobalContext::get();
        $specific = $piece->client?->ai_context ?? '';

        $parts = array_filter([$global, $specific]);

        return implode("\n\n---\n\n", $parts) ?: ($piece->client ? "Cliente: {$piece->client->name}" : '');
    }

    private function buildSystemInstruction(string $brandContext): string
    {
        return <<<PROMPT
Sos un experto en copywriting para publicidad digital en Argentina.
Tu tarea es escribir copy para ads de video en redes sociales (Meta/Instagram/TikTok).

=== CONTEXTO DE MARCA ===
{$brandContext}
=== FIN DEL CONTEXTO ===

Reglas:
- Lenguaje coloquial argentino (vos, che)
- Máximo 3 frases por variante
- Cada variante autónoma (no necesita ver el video)
- Incluí el CTA en cada variante
- Respondé SIEMPRE con JSON con estas claves: directo, storytelling, educativo
PROMPT;
    }

    private function buildUserPrompt(ContentPiece $piece): string
    {
        $development = $piece->development
            ? "Desarrollo del contenido: {$piece->development}\n"
            : '';

        return <<<PROMPT
Generá 3 variantes de copy para el siguiente ad:

Objetivo: {$piece->objective}
Hook visual del video: {$piece->hook}
{$development}CTA: {$piece->cta}
Categoría: {$piece->category}

Respondé SOLO con este JSON (sin markdown, sin explicaciones):
{
  "directo": "...",
  "storytelling": "...",
  "educativo": "..."
}
PROMPT;
    }

    private function parseResponse(string $raw): array
    {
        // Gemini a veces devuelve el JSON entre code fences
        $cleaned = preg_replace('/^```(?:json)?\s*/m', '', $raw);
        $cleaned = preg_replace('/\s*```$/m', '', $cleaned);
        $cleaned = trim($cleaned);

        $data = json_decode($cleaned, true);

        if (
            !is_array($data) ||
            !isset($data['directo'], $data['storytelling'], $data['educativo'])
        ) {
            throw new RuntimeException('Gemini devolvió una respuesta inesperada. Intentá de nuevo.');
        }

        return [
            'directo'      => trim($data['directo']),
            'storytelling' => trim($data['storytelling']),
            'educativo'    => trim($data['educativo']),
        ];
    }
}
