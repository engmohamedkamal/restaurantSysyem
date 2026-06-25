import mongoose, { Types } from "mongoose";

export enum OrderStatus {
    pending = "pending",
    preparing = "preparing",
    delivering = "delivering",
    delivered = "delivered",
    cancelled = "cancelled",
}

export enum PaymentMethod {
    cash = "cash",
    card = "card",
}

export enum OrderType {
    takeaway = "takeaway",
    delivery = "delivery",
    dine_in = "dine_in",
}

export interface IOrderOption {
    groupName: string;
    optionName: string;
    price: number;
}

export interface IOrderItem {
    product: Types.ObjectId;
    quantity: number;
    price: number;
    selectedOptions: IOrderOption[];
}

export interface IOrder {
    _id: Types.ObjectId;
    orderNumber: number;
    notes?: string;
    user?: Types.ObjectId;
    cashier?: Types.ObjectId;
    chef?: Types.ObjectId;
    items: IOrderItem[];
    orderType: OrderType;
    tableNumber?: number;
    customerName?: string;
    discount: number;
    deliveryFee: number;
    subTotal: number;
    totalPrice: number;
    shippingAddress?: string;
    phone: string;
    paymentMethod: PaymentMethod;
    status: OrderStatus;
    coupon?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const orderOptionSchema = new mongoose.Schema({
    groupName: {
        type: String,
        required: true,
        trim: true,
    },
    optionName: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
}, { _id: false });

const orderItemSchema = new mongoose.Schema<IOrderItem>({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    selectedOptions: {
        type: [orderOptionSchema],
        default: [],
    },
}, { _id: false });

const orderSchema = new mongoose.Schema<IOrder>({
    orderNumber: {
        type: Number,
        required: true,
        unique: true,
        index: true,
    },
    notes: {
        type: String,
        trim: true,
        default: "",
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: false,
        index: true,
    },
    chef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: false,
        index: true,
    },
    items: {
        type: [orderItemSchema],
        required: true,
    },
    orderType: {
        type: String,
        enum: Object.values(OrderType),
        default: OrderType.dine_in,
        index: true,
    },
    tableNumber: {
        type: Number,
        required: function(this: any) {
            return this.orderType === OrderType.dine_in;
        },
    },
    customerName: {
        type: String,
        required: function(this: any) {
            return this.orderType === OrderType.dine_in || this.orderType === OrderType.takeaway;
        },
        trim: true,
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
    },
    deliveryFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    subTotal: {
        type: Number,
        required: true,
        min: 0,
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    shippingAddress: {
        type: String,
        required: function(this: any) {
            return this.orderType === OrderType.delivery;
        },
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        default: PaymentMethod.cash,
    },
    status: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.pending,
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        required: false,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

orderSchema.index({ user: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: 1 });

const orderModel = (mongoose.models.Order || mongoose.model<IOrder>("Order", orderSchema)) as mongoose.Model<IOrder>;

export default orderModel;
