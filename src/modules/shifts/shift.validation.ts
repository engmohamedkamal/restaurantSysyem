import { z } from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const startShiftSchema = {
    body: z.object({
        startCash: z.number().min(0).default(0),
        notes: z.string().optional(),
    }).strict()
};

export const endShiftSchema = {
    body: z.object({
        endCash: z.number().min(0),
        notes: z.string().optional(),
    }).strict()
};

export const getShiftStatsSchema = {
    query: z.object({
        shiftId: z.string().regex(objectIdPattern, "Invalid shift ID").optional(),
        employeeId: z.string().regex(objectIdPattern, "Invalid employee ID").optional(),
    }).strict()
};

export type StartShiftInput = z.infer<typeof startShiftSchema.body>;
export type EndShiftInput = z.infer<typeof endShiftSchema.body>;
