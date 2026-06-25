import { Router } from "express";
import expenseService from "./expense.service";
import * as EV from "./expense.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { Role } from "../../DB/model/user.model";
import { EmployeeRole } from "../../DB/model/employee.model";
import { validation } from "../../middleware/validation";

const expenseRouter = Router();

// Authenticate all routes
expenseRouter.use(authentication());

// Register a new expense
expenseRouter.post("/",
    authorization(Role.manager, EmployeeRole.cashier),
    validation(EV.createExpenseSchema),
    expenseService.createExpense
);

// List expenses
expenseRouter.get("/",
    authorization(Role.manager, EmployeeRole.cashier),
    validation(EV.listExpensesSchema),
    expenseService.listExpenses
);

// Get specific expense detail
expenseRouter.get("/:expenseId",
    authorization(Role.manager, EmployeeRole.cashier),
    validation(EV.getExpenseSchema),
    expenseService.getExpenseById
);

// Delete an expense record (Manager only)
expenseRouter.delete("/:expenseId",
    authorization(Role.manager),
    validation(EV.getExpenseSchema),
    expenseService.deleteExpense
);

export default expenseRouter;
