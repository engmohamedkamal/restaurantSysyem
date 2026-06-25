import z from "zod";

const objectIdField = z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid ID");

const optionSchema = z.object({
    name: z.string().min(1, "option name is required").max(100).trim(),
    price: z.number().min(0, "price cannot be negative").default(0),
    isAvailable: z.boolean().default(true),
});

export const createModifierGroupSchema = {
    body: z.object({
        name: z.string().min(2, "name must be at least 2 characters").max(100).trim(),
        minSelect: z.number().int().min(0).default(0),
        maxSelect: z.number().int().min(1).default(1),
        options: z.array(optionSchema).min(1, "at least one option is required"),
    }).refine(data => data.maxSelect >= data.minSelect, {
        message: "maxSelect must be >= minSelect",
        path: ["maxSelect"],
    }),
};

export const updateModifierGroupSchema = {
    params: z.object({
        id: objectIdField,
    }),
    body: z.object({
        name: z.string().min(2).max(100).trim().optional(),
        minSelect: z.number().int().min(0).optional(),
        maxSelect: z.number().int().min(1).optional(),
        options: z.array(optionSchema).min(1, "at least one option is required").optional(),
    }),
};

export const getModifierGroupSchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export const deleteModifierGroupSchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export const listModifierGroupsSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        search: z.string().max(100).optional(),
    }),
};

export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema.body>;
export type UpdateModifierGroupInput = z.infer<typeof updateModifierGroupSchema.body>;
export type ListModifierGroupsQuery = z.infer<typeof listModifierGroupsSchema.query>;
