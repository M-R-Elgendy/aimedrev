import { z } from 'zod';

export const ragOutputSchema = z.object({
    completenessRating: z
        .number()
        .int()
        .min(1)
        .max(5)
        .describe("The completeness rating for the patient summary, on a scale from 1 (very incomplete) to 5 (very complete)."),
    recommendedImprovements: z
        .array(z.string())
        .describe(
            "A list of recommendations or missing elements that would make the summary more complete. If none are needed, the array can contain a statement such as 'No further improvements are needed.'"
        ),
}).describe(`Structured evaluation of the patient summary's completeness.`);