import mongoose, { Types } from "mongoose";

export interface ICategory {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    image: {
        secure_url: string;
        public_id: string;
    };
    icon?: string;
    displayOrder: number;
    isActive: boolean;
    isDeleted: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const categorySchema = new mongoose.Schema<ICategory>({
    name: {
        type: String,
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 50,
    },
    description: {
        type: String,
        trim: true,
        maxLength: 500,
    },
    image: {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true },
    },
    icon: {
        type: String,
        trim: true,
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

categorySchema.index({ isDeleted: 1, isActive: 1 });

categorySchema.pre(/^find/, function (this: mongoose.Query<any, any>) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: false });
    }

} as any);

categorySchema.pre("countDocuments" as any, function (this: mongoose.Query<any, any>) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: false });
    }

} as any);

const categoryModel = (mongoose.models.Category || mongoose.model<ICategory>("Category", categorySchema)) as mongoose.Model<ICategory>;

export default categoryModel;