import { Router } from "express";
import OS from "./order.service";
import { validation } from "../../middleware/validation";
import * as OV from "./order.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { Role } from "../../DB/model/user.model";
import { EmployeeRole } from "../../DB/model/employee.model";

import { TokenType } from "../../utils/token";

const orderRouter = Router();

orderRouter.post("/guest-dine-in",
    validation(OV.createGuestOrderSchema),
    OS.createGuestOrder
);

orderRouter.post("/",
    authentication(TokenType.access, true),
    validation(OV.createOrderSchema),
    OS.createOrder
);

orderRouter.use(authentication());

orderRouter.get("/kitchen",
    authorization(Role.manager, EmployeeRole.cashier, EmployeeRole.chef),
    OS.getKitchenOrders
);

orderRouter.get("/my-orders",
    authorization(Role.user, Role.manager , EmployeeRole.cashier),
    OS.getMyOrders
);

orderRouter.get("/:orderId",
    authorization(Role.user, Role.manager , EmployeeRole.cashier),
    validation(OV.getOrderSchema),
    OS.getOrderById
);

orderRouter.get("/",
    authorization(Role.manager ,EmployeeRole.cashier ),
    validation(OV.listOrdersSchema),
    OS.listAllOrders
);

orderRouter.patch("/:orderId/status",
    authorization(Role.manager , EmployeeRole.cashier),
    validation(OV.updateOrderStatusSchema),
    OS.updateOrderStatus
);

export default orderRouter;
