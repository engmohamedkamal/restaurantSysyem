import mongoose, { Types } from "mongoose";


export enum Role {
    user = "user",
    manager = "manager",
}

export enum proveidorType {
    system = "system",
    google = "google",
    facebook = "facebook",
}

export interface IUser {
    _id: Types.ObjectId,
    name: string,
    email: string,
    phone: string,
    password: string,
    isVerified: boolean,
    isDeleted: boolean,
    proveidorType: proveidorType,
    changCredentials: Date,
    addres: string,
    specialNotes: string,
    role: Role,
    createdAt: Date,
    updatedAt: Date
}

const userSchema = new mongoose.Schema<IUser>({
    name: { type: String, required: true, minLength: 2, maxLength: 50, trim: true },
    email: {
        type: String, required: function (): boolean {
            return this.proveidorType === proveidorType.google ? false : true
        }, unique: true, trim: true
    },
    phone: {
        type: String, required: function (): boolean {
            return this.proveidorType === proveidorType.google ? false : true
        }
    },
    password: {
        type: String, required: function (): boolean {
            return this.proveidorType === proveidorType.google ? false : true
        }
    },
    role: { type: String, enum: [Role.user, Role.manager], default: Role.user },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    proveidorType: { type: String, enum: proveidorType, default: proveidorType.system },
    changCredentials: { type: Date },
    addres: { type: String, required: function (): boolean {
            return this.proveidorType === proveidorType.google ? false : true
        } },
    specialNotes: { type: String, default: "" }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

const userModel = (mongoose.models.User || mongoose.model<IUser>("User", userSchema)) as mongoose.Model<IUser>

export default userModel