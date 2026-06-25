import { Request, Response, NextFunction } from "express";
import expenseModel from "../../DB/model/expense.model";
import shiftModel from "../../DB/model/shift.model";
import { AppError } from "../../utils/AppError";
import { CreateExpenseInput } from "./expense.validation";

class ExpenseService {
    createExpense = async (req: Request, res: Response, next: NextFunction) => {
        const { amount, category, description }: CreateExpenseInput = req.body;
        const employeeId = req.user!._id;

        // Check if there is an active shift for this employee to link the expense
        const activeShift = await shiftModel.findOne({ employee: employeeId, isActive: true }).lean();

        const newExpense = await expenseModel.create({
            amount,
            category,
            description,
            paidBy: employeeId,
            ...(activeShift ? { shiftId: activeShift._id } : {})
        } as any);

        return res.status(201).json({
            message: "Expense registered successfully",
            expense: newExpense
        });
    };

    listExpenses = async (req: Request, res: Response, next: NextFunction) => {
        const { page = "1", limit = "10", category } = req.query;

        const filter: any = {};
        if (category) {
            filter.category = category;
        }

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [expenses, total] = await Promise.all([
            expenseModel.find(filter)
                .populate("paidBy", "name username role")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            expenseModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            message: "success",
            expenses,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    };

    getExpenseById = async (req: Request, res: Response, next: NextFunction) => {
        const { expenseId } = req.params;

        const expense = await expenseModel.findById(expenseId)
            .populate("paidBy", "name username role")
            .populate("shiftId")
            .lean();

        if (!expense) {
            throw new AppError("Expense record not found", 404);
        }

        return res.status(200).json({
            message: "success",
            expense
        });
    };

    deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
        const { expenseId } = req.params;

        const expense = await expenseModel.findByIdAndDelete(expenseId);
        if (!expense) {
            throw new AppError("Expense record not found", 404);
        }

        return res.status(200).json({
            message: "Expense record deleted successfully"
        });
    };
}

export default new ExpenseService();
