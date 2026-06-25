import z from "zod";

const nameField = z.string().min(2, "name must be at least 2 characters").max(50, "name must be at most 50 characters").trim();
const descriptionField = z.string().max(500, "description must be at most 500 characters").trim().optional();
const iconField = z.string().trim().optional();
const displayOrderField = z.number().or(z.string().regex(/^\d+$/).transform(Number)).optional();
const isActiveField = z.boolean().or(z.enum(["true", "false"]).transform((v) => v === "true")).optional();
const objectIdField = z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid ID");

export const createCategorySchema = {
    body: z.object({
        name: nameField,
        description: descriptionField,
        icon: iconField,
        displayOrder: displayOrderField,
        isActive: isActiveField,
    }),
};

export const updateCategorySchema = {
    body: z.object({
        name: nameField.optional(),
        description: descriptionField,
        icon: iconField,
        displayOrder: displayOrderField,
        isActive: isActiveField,
    }),
    params: z.object({
        id: objectIdField,
    }),
};

export const getCategorySchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export const listCategoriesSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
        search: z.string().max(50).optional(),
    }),
};

export const toggleStatusSchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export const deleteCategorySchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export type CreateCategoryInput = z.infer<typeof createCategorySchema.body>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema.body>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesSchema.query>;
