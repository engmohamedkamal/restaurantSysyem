import { Router } from "express";
import ES from "./employee.service";
import { validation } from "../../middleware/validation";
import * as EV from "./employee.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { MulterHost, allowedExtensions } from "../../middleware/multer";

const employeeRouter = Router();

employeeRouter.use(authentication(), authorization("manager"));

const upload = MulterHost({ customExtension: allowedExtensions.image, fileSizeMB: 2 });

employeeRouter.post("/",
    upload.single("image"),
    validation(EV.createEmployeeSchema),
    ES.createEmployee
);

employeeRouter.get("/",
    validation(EV.listEmployeesSchema),
    ES.listEmployees
);

employeeRouter.get("/:id",
    validation(EV.getEmployeeSchema),
    ES.getEmployee
);

employeeRouter.patch("/:id",
    upload.single("image"),
    validation(EV.updateEmployeeSchema),
    ES.updateEmployee
);

employeeRouter.delete("/:id",
    validation(EV.deleteEmployeeSchema),
    ES.deleteEmployee
);

export default employeeRouter;
