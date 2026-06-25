import mongoose, { Types } from "mongoose";

export enum EmployeeRole {
    manager = "manager",
    chef = "chef",
    cashier = "cashier",
    waiter = "waiter",
}

export enum SalaryType {
    hourly = "hourly",
    monthly = "monthly",
}

export interface IPermissions {
    orderManagement: boolean;
    cashier: boolean;
    productManagement: boolean;
    inventory: boolean;
    reports: boolean;
}

export interface IEmployee {
    _id: Types.ObjectId;
    name: string;
    phone: string;
    email: string;
    image: {
        secure_url: string;
        public_id: string;
    };
    username: string;
    password: string;
    role: EmployeeRole;
    salaryType: SalaryType;
    salary: number;
    hourlyRate: number;
    hireDate: Date;
    permissions: IPermissions;
    isActive: boolean;
    isDeleted: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const employeeSchema = new mongoose.Schema<IEmployee>({
    name: {
        type: String,
        required: true,
        minLength: 2,
        maxLength: 50,
        trim: true,
        index: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true,
    },
    image: {
        secure_url: { type: String, default: "" },
        public_id: { type: String, default: "" },
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minLength: 3,
        maxLength: 30,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    role: {
        type: String,
        enum: Object.values(EmployeeRole),
        required: true,
        index: true,
    },
    salaryType: {
        type: String,
        enum: Object.values(SalaryType),
        default: SalaryType.monthly,
    },
    salary: {
        type: Number,
        default: 0,
        min: 0,
    },
    hourlyRate: {
        type: Number,
        default: 0,
        min: 0,
    },
    hireDate: {
        type: Date,
    },
    permissions: {
        orderManagement: { type: Boolean, default: false },
        cashier: { type: Boolean, default: false },
        productManagement: { type: Boolean, default: false },
        inventory: { type: Boolean, default: false },
        reports: { type: Boolean, default: false },
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

employeeSchema.index({ isDeleted: 1, role: 1, isActive: 1 });

employeeSchema.pre(/^find/, function (this: mongoose.Query<any, any>) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: false });
    }

} as any);
employeeSchema.pre("countDocuments" as any, function (this: mongoose.Query<any, any>) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: false });
    }
} as any);

const employeeModel = (mongoose.models.Employee || mongoose.model<IEmployee>("Employee", employeeSchema)) as mongoose.Model<IEmployee>;

export default employeeModel;
