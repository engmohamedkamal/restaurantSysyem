import { Router } from "express";
import shiftService from "./shift.service";
import * as SV from "./shift.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { Role } from "../../DB/model/user.model";
import { EmployeeRole } from "../../DB/model/employee.model";
import { validation } from "../../middleware/validation";

const shiftRouter = Router();

// Authenticate all routes
shiftRouter.use(authentication());

// Start a shift
shiftRouter.post("/",
    authorization(Role.manager, EmployeeRole.cashier, EmployeeRole.chef),
    validation(SV.startShiftSchema),
    shiftService.startShift
);

// End current shift
shiftRouter.post("/end",
    authorization(Role.manager, EmployeeRole.cashier, EmployeeRole.chef),
    validation(SV.endShiftSchema),
    shiftService.endShift
);

// Get live stats for current active shift
shiftRouter.get("/current",
    authorization(Role.manager, EmployeeRole.cashier, EmployeeRole.chef),
    shiftService.getCurrentShiftStats
);

// Manager Dashboard Overview
shiftRouter.get("/overview",
    authorization(Role.manager),
    shiftService.getDashboardOverview
);

// Get specific shift details
shiftRouter.get("/:shiftId",
    authorization(Role.manager),
    validation(SV.getShiftStatsSchema),
    shiftService.getShiftDetails
);

export default shiftRouter;
