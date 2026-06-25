import z from "zod";
import { PaymentMethod, OrderStatus, OrderType } from "../../DB/model/order.model";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createOrderSchema = {
    body: z.object({
        orderType: z.enum([OrderType.takeaway, OrderType.delivery, OrderType.dine_in]).default(OrderType.delivery),
        tableNumber: z.number().min(1).optional(),
        customerName: z.string().min(2, "Name is too short").optional(),
        discount: z.number().min(0).default(0),
        shippingAddress: z.string().min(5, "Address is too short").optional(),
        phone: z.string().regex(/^01[0125][0-9]{8}$/, "Invalid Egyptian phone number").optional(),
        paymentMethod: z.enum([PaymentMethod.cash, PaymentMethod.card]).default(PaymentMethod.cash),
        deliveryFee: z.number().min(0).optional(),
        couponCode: z.string().optional(),
        notes: z.string().optional(),
        chefId: z.string().regex(objectIdPattern, "Invalid chef ID").optional(),
        
        items: z.array(
            z.object({
                product: z.string().regex(objectIdPattern, "Invalid product ID"),
                quantity: z.number().min(1, "Quantity must be at least 1")
            })
        ).optional(),
        userId: z.string().regex(objectIdPattern, "Invalid user ID").optional(), 
    }).strict()
    .refine((data) => {
        if (data.orderType === OrderType.dine_in && !data.tableNumber) {
            return false;
        }
        return true;
    }, {
        message: "Table number is required for dine-in orders",
        path: ["tableNumber"]
    })
};

export const updateOrderStatusSchema = {
    params: z.object({
        orderId: z.string().regex(objectIdPattern, "Invalid order ID")
    }),
    body: z.object({
        status: z.enum([
            OrderStatus.pending,
            OrderStatus.preparing,
            OrderStatus.delivering,
            OrderStatus.delivered,
            OrderStatus.cancelled
        ]),
        chefId: z.string().regex(objectIdPattern, "Invalid chef ID").optional()
    }).strict()
};

export const getOrderSchema = {
    params: z.object({
        orderId: z.string().regex(objectIdPattern, "Invalid order ID")
    })
};

export const listOrdersSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        status: z.enum([
            OrderStatus.pending,
            OrderStatus.preparing,
            OrderStatus.delivering,
            OrderStatus.delivered,
            OrderStatus.cancelled
        ]).optional(),
        orderType: z.enum([
            OrderType.takeaway,
            OrderType.delivery,
            OrderType.dine_in
        ]).optional(),
    })
};

export const createGuestOrderSchema = {
    body: z.object({
        tableNumber: z.number().min(1),
        customerName: z.string().min(2, "Name is too short"),
        phone: z.string().regex(/^01[0125][0-9]{8}$/, "Invalid Egyptian phone number"),
        paymentMethod: z.enum([PaymentMethod.cash, PaymentMethod.card]).default(PaymentMethod.cash),
        notes: z.string().optional(),
        items: z.array(
            z.object({
                product: z.string().regex(objectIdPattern, "Invalid product ID"),
                quantity: z.number().min(1, "Quantity must be at least 1")
            })
        ).min(1, "At least one item is required")
    })
};

export type CreateOrderInput = z.input<typeof createOrderSchema.body>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema.body>;
export type ListOrdersQuery = z.infer<typeof listOrdersSchema.query>;
export type CreateGuestOrderInput = z.infer<typeof createGuestOrderSchema.body>;