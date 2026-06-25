import mongoose, { Types, Schema, Document } from "mongoose";

export enum ExpenseCategory {
    salaries = "salaries",    // يوميات للموظفين
    supplies = "supplies",    // بضاعة/مشتريات من الخارج
    bills = "bills",          // فواتير
    other = "other"
}

export interface IExpense {
    _id: Types.ObjectId;
    amount: number;
    category: ExpenseCategory;
    description: string;
    paidBy: Types.ObjectId; // Ref to Employee who made the expense
    shiftId?: Types.ObjectId; // Ref to Shift if it was paid from a drawer/shift
    createdAt: Date;
    updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>({
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    category: {
        type: String,
        enum: Object.values(ExpenseCategory),
        required: true,
        index: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    paidBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true,
        index: true,
    },
    shiftId: {
        type: Schema.Types.ObjectId,
        ref: "Shift",
        required: false,
        index: true,
    }
}, {
    timestamps: true
});

const expenseModel = (mongoose.models.Expense || mongoose.model<IExpense>("Expense", expenseSchema)) as mongoose.Model<IExpense>;
export default expenseModel;
