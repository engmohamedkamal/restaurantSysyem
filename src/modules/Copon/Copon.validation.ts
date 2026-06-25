import z from "zod";

const code = z.string().min(3, "code must be at least 3 characters ").max(50, "code must be at most 50 characters").trim()
const discountType = z.enum(["percentage", "fixed"], { message: "discountType must be either percentage or fixed" })
const discountValue = z.number().min(0, "discountValue can't be negtive")
const maxDiscountAmount = z.number().min(0, "maxDiscountAmount can't be negtive").optional()
const minOrderAmount = z.number().min(0, "minOrderAmount can't be negtive").optional()
const maxOrderAmount = z.number().min(0, "maxOrderAmount can't be negtive").optional()
const startDate = z.string().refine((date) => date.match(/^\d{4}-\d{2}-\d{2}$/), { message: "invalid date format (YYYY-MM-DD)" }).default(
    new Date().toISOString().split("T")[0] as any
)
const endDate = z.string().refine((date) => date.match(/^\d{4}-\d{2}-\d{2}$/), { message: "invalid date format (YYYY-MM-DD)" })
const usageLimit = z.number().min(1, "usageLimit can't be less then 1").optional()

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createCoupon = {
    body: z.object({
        code,
        discountType,
        discountValue,
        maxDiscountAmount,
        minOrderAmount,
        maxOrderAmount,
        startDate,
        endDate,
        usageLimit,
    }).superRefine((data, ctx) => {
        if (data.discountType === "percentage") {
            if (data.discountValue > 100) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "percentage discount can't be more than 100",
                    path: ["discountValue"],
                });
            }
        }
        else if (data.discountType === "fixed") {
            if (data.maxDiscountAmount !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "maxDiscountAmount shouldn't be provided when discountType is fixed",
                    path: ["maxDiscountAmount"],
                });
            }
        }
    })
}

export const updateCoupon = {
    params: z.object({
        couponId: z.string().regex(objectIdPattern, "Invalid coupon ID")
    }),
    body: z.object({
        code: code.optional(),
        discountType: discountType.optional(),
        discountValue: discountValue.optional(),
        maxDiscountAmount: maxDiscountAmount.optional(),
        minOrderAmount: minOrderAmount.optional(),
        maxOrderAmount: maxOrderAmount.optional(),
        startDate: startDate.optional(),
        endDate: endDate.optional(),
        usageLimit: usageLimit.optional(),
        isActive: z.boolean().optional(),
    }).strict().superRefine((data, ctx) => {
        if (data.discountType === "percentage") {
            if (data.discountValue !== undefined && data.discountValue > 100) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "percentage discount can't be more than 100",
                    path: ["discountValue"],
                });
            }
        } else if (data.discountType === "fixed") {
            if (data.maxDiscountAmount !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "maxDiscountAmount shouldn't be provided when discountType is fixed",
                    path: ["maxDiscountAmount"],
                });
            }
        }
    })
};

export const getCouponById = {
    params: z.object({
        couponId: z.string().regex(objectIdPattern, "Invalid coupon ID")
    })
};

export const listCoupons = {
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        isActive: z.enum(["true", "false"]).optional(),
    })
};

export type CreateCouponInput = z.infer<typeof createCoupon.body>;
export type UpdateCouponInput = z.infer<typeof updateCoupon.body>;
export type ListCouponsQuery = z.infer<typeof listCoupons.query>;
