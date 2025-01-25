import { BadRequestException, Injectable } from "@nestjs/common";
import { OpenAIService } from 'src/openai/openai.service';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable, RunnableConfig, RunnablePassthrough } from "@langchain/core/runnables";
import { evidenceRagOutputSchema, outputValidationSchema } from "../z-schemas/rag-output.schema";

type AnswerChain = Runnable<any, {
    answer?: string;
    citations?: number[];
}, RunnableConfig<Record<string, any>>>;

type ValidationChain = Runnable<any, {
    verdict?: "YES" | "NO";
    explanation?: string;
}, RunnableConfig<Record<string, any>>>

@Injectable()
export class RagChain {

    constructor(
        private readonly openaiService: OpenAIService,
    ) { }

    async getRagChain() {
        const ragPrompt = this._getRagPrompt();
        const ragLLM = this.openaiService.ragLLM();
        const prompotValidation = this._getPromptValidation();
        const validationLLM = this.openaiService.validationLLM();

        const answerChain: AnswerChain = ragPrompt.pipe(ragLLM.withStructuredOutput(evidenceRagOutputSchema));
        const ragChain = this._getRagChain(answerChain);

        const validationChain: ValidationChain = prompotValidation.pipe(validationLLM.withStructuredOutput(outputValidationSchema));
        const inputsValidations = this.inputsValidations(validationChain);

        return ragChain.pipe(inputsValidations);
    }

    private fomatDocs(documents: any) {
        return (
            "\n\n" +
            documents
                .map(
                    (doc, idx) =>
                        `Source ID: ${idx}\nArticle Snippet: ${doc.pageContent}`
                )
                .join("\n\n")
        );
    }

    private _getRagPrompt() {
        return ChatPromptTemplate.fromMessages(
            [
                [
                    "system",
                    `You are Physaid, an assistant for medical question-answering tasks.
                Rules to Follow:
                - Answer the questions using only the provided articles snippets. 
                - If the context cannot answer the question, clearly say "I can't find relevant articles in our DB". 
                 Context: {context}`
                ],
                [
                    "human",
                    `Question: {question}`
                ]
            ]
        );
    }

    private _getPromptValidation() {
        return ChatPromptTemplate.fromMessages([
            [
                "system",
                `You are a second-level verifier. Your job is to check if the provided answer 
               sufficiently addresses the user's question. If it does, reply "YES". 
               If not, reply "NO" and give a brief explanation.`
            ],
            [
                "human",
                `User's question: {question}\n
               Model's answer: {answer}\n
               Does this answer address the question accurately?`
            ]
        ]);
    }

    private _getRagChain(answerChain: AnswerChain) {
        return new RunnablePassthrough()
            .assign({
                context: (input) => this.fomatDocs(input.docs)
            })
            .assign({
                quoted_answer: answerChain
            })
            .pick(["question", "quoted_answer"]);
    }

    private inputsValidations(validationChain: ValidationChain) {
        return new RunnablePassthrough()
            .assign({
                question: (input) => input.question,
                answer: (input: any) => input.quoted_answer.answer,
            })
            .assign({
                validation: validationChain
            })
            .pick(["quoted_answer", "validation"]);
    }

}