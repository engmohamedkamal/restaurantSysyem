import { Types } from "mongoose";
import z from "zod";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const selectedOptionInput = z.object({
    modifierGroupId: z.string().regex(objectIdPattern, "Invalid modifier group ID"),
    optionName: z.string().min(1, "Option name is required"),
});

export const addToCartSchema = {
    body: z.object({
        productId: z.string().regex(objectIdPattern, "Invalid product ID"),
        quantity: z.number().int().min(1).default(1),
        selectedOptions: z.array(selectedOptionInput).optional(),
    })
};

export const updateCartSchema = {
    params: z.object({
        productId: z.string().regex(objectIdPattern, "Invalid product ID")
    }).required(),
    body: z.object({
        quantity: z.number().int().min(1)
    }).required()
};

export const removeFromCartSchema = {
    params: z.object({
        productId: z.string().regex(objectIdPattern, "Invalid product ID")
    }).required()
};

export type AddToCartInput = z.infer<typeof addToCartSchema.body>;
export type UpdateCartInput = z.infer<typeof updateCartSchema.body>;
