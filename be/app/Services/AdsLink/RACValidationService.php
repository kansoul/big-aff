<?php

namespace App\Services\AdsLink;

use Illuminate\Support\Facades\Log;
use OpenAI;

class RACValidationService
{
    public function validateRAC(string $racContent): array
    {
        try {
            if (empty(trim($racContent))) {
                return [
                    'is_valid' => false,
                    'warning' => 'RAC field is empty. Please provide the complete referrer ad creative text.',
                ];
            }

            $client = OpenAI::client(config('services.openai.api_key'));
            $response = $client->chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a validator for Google\'s Related Search for Content referrerAdCreative parameter. You must strictly validate that the creative text includes ALL required components according to Google\'s guidelines. Always respond in valid JSON format.',
                    ],
                    [
                        'role' => 'user',
                        'content' => $this->buildValidationPrompt($racContent),
                    ],
                ],
                'temperature' => 0.1,
                'response_format' => ['type' => 'json_object'],
            ]);

            $content = trim($response->choices[0]->message->content);

            return $this->parseValidationResponse($content);
        } catch (\Exception $e) {
            Log::error('Failed to validate RAC content', [
                'error' => $e->getMessage(),
            ]);

            return [
                'is_valid' => false,
                'warning' => 'Unable to validate RAC content due to technical error: '.$e->getMessage(),
            ];
        }
    }

    private function buildValidationPrompt(string $racContent): string
    {
        return <<<PROMPT
You are validating a referrerAdCreative parameter for Google's Related Search for Content API.

According to Google's guidelines, the referrerAdCreative must include the creative text verbatim from the source ad.

A VALID RAC should contain at minimum:
1. **Title/Headline** - The main heading or title of the ad
2. **Description/Body Text** - Supporting text or call-to-action message
3. **Visual Elements** (at least ONE of the following, or none if the image or video has no text):
   - Text appearing on images/videos (overlay text, captions)
   - Button text or CTA button labels
   - Image/video description
4. **Optional but helpful**: Audio transcript, handle, hashtags, or other creative elements

Example of a STANDARD VALID RAC:
---
Discover How 5G Internet Transforms Your Digital Experience.

Internet 5g sounds interesting? Read more about Internet 5g!.Discover How 5G Internet Transforms Your Digital Experience.

The image shows a graphic with a black background. The text '5G' is prominent, with the 'G' in blue and a yellow signal icon next to it. Top-center overlay text in English: 'READ MORE ABOUT'. Center overlay text in English: '5G INTERNET'. Bottom-center overlay text in English: 'Learn How 5G Internet Transforms Your Digital Experience'.

No spoken words are present.
---

---BEGIN RAC CONTENT TO VALIDATE---
{$racContent}
---END RAC CONTENT---

Analyze the content above and validate it against the standard. Respond in JSON format:
{
    "is_valid": true/false,
    "missing_components": ["component1", "component2"],
    "warning": "Clear message about validation result"
}

VALIDATION RULES:
- Set is_valid to TRUE if it contains: title + description + at least one visual element (image text/button/description, but consider accepting this if the user says there is no text on the image/video.)
- Set is_valid to FALSE if ANY of these minimum components is clearly missing
- Be reasonable: if the content looks like a complete ad with headline, body, and image info, it's valid
- For missing components, list only the critical ones: "Title", "Description", "Visual elements (image text/button)"

CRITICAL RULE: Do not penalize if the image/video has no text, as long as a visual description of the scene is provided.
PROMPT;
    }

    private function parseValidationResponse(string $content): array
    {
        try {
            $jsonContent = $content;

            if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/s', $content, $matches)) {
                $jsonContent = $matches[1];
            } elseif (preg_match('/\{.*\}/s', $content, $matches)) {
                $jsonContent = $matches[0];
            }

            $result = json_decode($jsonContent, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('Failed to parse OpenAI RAC validation response as JSON', [
                    'content' => $content,
                    'error' => json_last_error_msg(),
                ]);

                $isValid = stripos($content, '"is_valid": true') !== false ||
                    stripos($content, 'is_valid: true') !== false;

                return [
                    'is_valid' => $isValid,
                    'warning' => $isValid ? null : 'RAC validation could not be parsed. Please ensure RAC contains title, description, text on image, and button text.',
                ];
            }

            $isValid = $result['is_valid'] ?? false;
            $warning = null;

            if (! $isValid) {
                $missingComponents = $result['missing_components'] ?? [];
                $baseWarning = $result['warning'] ?? 'RAC content does not meet Google\'s requirements.';

                if (! empty($missingComponents)) {
                    $componentsList = implode(', ', $missingComponents);
                    $warning = "RAC validation failed. Missing required components: {$componentsList}. ".
                        'Please ensure your RAC includes a title, description, and visual elements (image text/button text/image description).';
                } else {
                    $warning = $baseWarning.' Please ensure your RAC includes a title, description, and visual elements.';
                }
            }

            return [
                'is_valid' => $isValid,
                'warning' => $warning,
            ];
        } catch (\Exception $e) {
            Log::error('Error parsing RAC validation response', [
                'error' => $e->getMessage(),
                'content' => $content,
            ]);

            return [
                'is_valid' => false,
                'warning' => 'Unable to parse validation response. Please ensure RAC contains title, description, text on image, and button text.',
            ];
        }
    }
}
