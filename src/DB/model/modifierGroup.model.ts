import mongoose, { Types } from "mongoose";

export interface IOption {
    name: string;
    price: number;
    isAvailable: boolean;
}

export interface IModifierGroup {
    _id: Types.ObjectId;
    name: string;
    minSelect: number;
    maxSelect: number;
    options: IOption[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const optionSchema = new mongoose.Schema<IOption>({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 100,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
}, { _id: true });

const modifierGroupSchema = new mongoose.Schema<IModifierGroup>({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
        index: true,
    },
    minSelect: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    maxSelect: {
        type: Number,
        required: true,
        min: 1,
        default: 1,
    },
    options: {
        type: [optionSchema],
        required: true,
        validate: {
            validator: (v: IOption[]) => v.length > 0,
            message: "At least one option is required",
        },
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

const modifierGroupModel = (mongoose.models.ModifierGroup || mongoose.model<IModifierGroup>("ModifierGroup", modifierGroupSchema)) as mongoose.Model<IModifierGroup>;

export default modifierGroupModel;
