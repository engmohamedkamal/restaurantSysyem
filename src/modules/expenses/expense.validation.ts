import { z } from "zod";
import { ExpenseCategory } from "../../DB/model/expense.model";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createExpenseSchema = {
    body: z.object({
        amount: z.number().min(0, "Amount must be a positive number"),
        category: z.enum([
            ExpenseCategory.salaries,
            ExpenseCategory.supplies,
            ExpenseCategory.bills,
            ExpenseCategory.other
        ]),
        description: z.string().min(3, "Description is too short"),
    }).strict()
};

export const getExpenseSchema = {
    params: z.object({
        expenseId: z.string().regex(objectIdPattern, "Invalid expense ID")
    })
};

export const listExpensesSchema = {
    query: z.object({
        page: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional(),
        category: z.enum([
            ExpenseCategory.salaries,
            ExpenseCategory.supplies,
            ExpenseCategory.bills,
            ExpenseCategory.other
        ]).optional(),
    }).strict()
};

export type CreateExpenseInput = z.infer<typeof createExpenseSchema.body>;
