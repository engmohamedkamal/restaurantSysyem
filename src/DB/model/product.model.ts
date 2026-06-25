import mongoose, { Types } from "mongoose";

export interface IOfferProduct {
    product: Types.ObjectId;
    quantity: number;
}

export interface IProduct {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    price: number;
    oldPrice?: number;
    category: Types.ObjectId;
    image: {
        secure_url: string;
        public_id: string;
    };
    isAvailable: boolean;
    modifiers: Types.ObjectId[];
    isOffer: boolean;
    offerEndDate?: Date;
    offerProducts: IOfferProduct[];
    isDeleted: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const productSchema = new mongoose.Schema<IProduct>({
    name: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 100,
        index: true,
    },
    description: {
        type: String,
        trim: true,
        maxLength: 500,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    oldPrice: {
        type: Number,
        min: 0,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    image: {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true },
    },
    isAvailable: {
        type: Boolean,
        default: true,
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    modifiers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "ModifierGroup",
    }],
    isOffer: {
        type: Boolean,
        default: false,
        index: true,
    },
    offerEndDate: {
        type: Date,
    },
    offerProducts: [{
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
        _id: false,
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

productSchema.index({ isDeleted: 1, category: 1, isAvailable: 1 });

productSchema.pre(/^find/, function (this: mongoose.Query<any, any>, next: any) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: false });
    }

} as any);

productSchema.pre("countDocuments" as any, function (this: mongoose.Query<any, any>, next: any) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: false });
    }

} as any);

const productModel = (mongoose.models.Product || mongoose.model<IProduct>("Product", productSchema)) as mongoose.Model<IProduct>;

export default productModel;
