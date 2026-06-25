import { Model } from "mongoose";
import { IExpense } from "../model/expense.model";
import { DBRepo } from "./DB.repo";

export class ExpenseRepo extends DBRepo<IExpense> {
    constructor(protected readonly model: Model<IExpense>) {
        super(model);
    }
}
