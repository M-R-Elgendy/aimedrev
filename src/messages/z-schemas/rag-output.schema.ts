import { z } from 'zod';

export const summrayEvRagOutputSchema = z.object({
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


export const evidenceRagOutputSchema = z.object({
    answer: z
        .string()
        .describe("The answer to the user question, based only on the given sources."),
    citations: z
        .array(z.number())
        .describe("The integer IDs of the SPECIFIC sources which justify the answer."),
}).describe("A cited source from the given text");

export const outputValidationSchema = z.object({
    verdict: z.enum(["YES", "NO"]),
    explanation: z
        .string()
        .optional()
        .describe("A short explanation if the answer does not address the question."),
});