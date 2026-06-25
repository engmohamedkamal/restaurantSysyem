import mongoose, { Types, Schema, Document } from "mongoose";

export interface IShift {
    _id: Types.ObjectId;
    employee: Types.ObjectId;
    role: string;
    startTime: Date;
    endTime?: Date;
    isActive: boolean;
    startCash: number;
    endCash?: number;
    expectedEndCash?: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const shiftSchema = new Schema<IShift>({
    employee: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
    },
    role: {
        type: String,
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now,
    },
    endTime: {
        type: Date,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true,
    },
    startCash: {
        type: Number,
        required: true,
        default: 0,
    },
    endCash: {
        type: Number,
    },
    expectedEndCash: {
        type: Number,
        default: 0,
    },
    notes: {
        type: String,
        trim: true,
    }
}, {
    timestamps: true
});

const shiftModel = (mongoose.models.Shift || mongoose.model<IShift>("Shift", shiftSchema)) as mongoose.Model<IShift>;
export default shiftModel;
