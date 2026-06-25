import mongoose, { Types } from "mongoose";

export enum discountType {
    percentage = 'percentage',
    fixed = 'fixed',
}

export interface ICoupon {
    _id: Types.ObjectId;
    code: string;
    discountType: discountType;
    discountValue: number;
    minOrderAmount: number | undefined;
    maxOrderAmount?: number | undefined;
    maxDiscountAmount?: number | undefined;
    startDate: Date;
    endDate: Date;
    usageLimit?: number | undefined;
    usageCount: number;
    usersUsed: Types.ObjectId[];
    isActive: boolean;
    isDeleted: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const couponSchema = new mongoose.Schema<ICoupon>({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 3,
        maxLength: 50,
    },

    discountType: {
        type: String,
        enum: Object.values(discountType),
        default: discountType.percentage,
        required: true,
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0,
    },
    minOrderAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    maxOrderAmount: {
        type: Number,
        min: 0,
    },
    maxDiscountAmount: {
        type: Number,
        min: 0,
    },
    startDate : {
        type: Date,
        required: true,
    },
    endDate : {
        type: Date,
        required: true,
    },
    usageLimit: {
        type: Number,
        min: 1,
    },
    usageCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    usersUsed: {
        type: [Types.ObjectId],
        default: [],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
    },
},{
    timestamps: true,
})


const coponModel = (mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", couponSchema)) as mongoose.Model<ICoupon>;
export default coponModel;