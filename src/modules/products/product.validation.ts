import z from "zod";

const nameField = z.string().min(2, "name must be at least 2 characters").max(100, "name must be at most 100 characters").trim();
const descriptionField = z.string().min(2, "description must be at least 2 characters").max(500, "description must be at most 500 characters").trim();
const priceField = z.number().min(0, "price cannot be negative").or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number).pipe(z.number().min(0, "price cannot be negative")));
const oldPriceField = z.number().min(0, "oldPrice cannot be negative").or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number).pipe(z.number().min(0, "oldPrice cannot be negative"))).optional();
const categoryField = z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid category ID");
const objectIdField = z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid ID");
const modifiersField = z.preprocess((val) => {
    if (typeof val === "string") {
        try {
            return JSON.parse(val);
        } catch {
            return [];
        }
    }
    return val;
}, z.array(objectIdField)).optional();
const isAvailableField = z.boolean().or(z.enum(["true", "false"]).transform((v) => v === "true")).optional();
const isOfferField = z.boolean().or(z.enum(["true", "false"]).transform((v) => v === "true")).optional();
const offerEndDateField = z.string().transform((v) => new Date(v)).optional();
const offerProductsField = z.preprocess((val) => {
    if (typeof val === "string") {
        try {
            return JSON.parse(val);
        } catch {
            return [];
        }
    }
    return val;
}, z.array(z.object({
    product: objectIdField,
    quantity: z.number().int().min(1).default(1)
}))).optional();

export const createProductSchema = {
    body: z.object({
        name: nameField,
        description: descriptionField.optional(),
        price: priceField,
        oldPrice: oldPriceField,
        category: categoryField,
        isAvailable: isAvailableField,
        isOffer: isOfferField,
        offerEndDate: offerEndDateField,
        offerProducts: offerProductsField,
        modifiers: modifiersField,
    }),
};

export const updateProductSchema = {
    body: z.object({
        name: nameField.optional(),
        description: descriptionField.optional(),
        price: priceField.optional(),
        oldPrice: oldPriceField,
        category: categoryField.optional(),
        isAvailable: isAvailableField,
        modifiers: modifiersField,
        isOffer: isOfferField,
        offerEndDate: offerEndDateField,
        offerProducts: offerProductsField,
    }),
    params: z.object({
        id: objectIdField,
    }),
};

export const getProductSchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export const listProductsSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, "invalid category ID").optional(),
        isAvailable: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
        isOffer: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
        search: z.string().max(100).optional(),
    }),
};

export const toggleStatusSchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export const deleteProductSchema = {
    params: z.object({
        id: objectIdField,
    }),
};

export type CreateProductInput = z.infer<typeof createProductSchema.body>;
export type UpdateProductInput = z.infer<typeof updateProductSchema.body>;
export type ListProductsQuery = z.infer<typeof listProductsSchema.query>;