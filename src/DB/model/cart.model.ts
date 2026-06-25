import mongoose, { Types } from "mongoose";

export interface ISelectedOption {
    modifierGroupId: Types.ObjectId;
    groupName: string;
    optionName: string;
    price: number;
}

export interface ICartItem {
    product: Types.ObjectId;
    quantity: number;
    price: number;
    selectedOptions: ISelectedOption[];
}

export interface ICart {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    items: ICartItem[];
    deliveryFee: number;
    subTotal: number;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}

const selectedOptionSchema = new mongoose.Schema({
    modifierGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ModifierGroup",
        required: true,
    },
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

const cartItemSchema = new mongoose.Schema<ICartItem>({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    selectedOptions: {
        type: [selectedOptionSchema],
        default: [],
    },
}, { _id: true });

const cartSchema = new mongoose.Schema<ICart>({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
    },
    items: {
        type: [cartItemSchema],
        default: [],
    },
    deliveryFee: {
        type: Number,
        default: 25,
        min: 0,
    },
    subTotal: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalPrice: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

const cartModel = (mongoose.models.Cart || mongoose.model<ICart>("Cart", cartSchema)) as mongoose.Model<ICart>;

export default cartModel;
