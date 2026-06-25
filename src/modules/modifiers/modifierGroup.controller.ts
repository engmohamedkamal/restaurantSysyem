import { Router } from "express";
import MGS from "./modifierGroup.service";
import { validation } from "../../middleware/validation";
import * as MGV from "./modifierGroup.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";

const modifierRouter = Router();

// Public: list and get modifier groups (needed for menu display)
modifierRouter.get("/",
    validation(MGV.listModifierGroupsSchema),
    MGS.listModifierGroups
);

modifierRouter.get("/:id",
    validation(MGV.getModifierGroupSchema),
    MGS.getModifierGroup
);

// Protected: manager only
modifierRouter.use(authentication(), authorization("manager"));

modifierRouter.post("/",
    validation(MGV.createModifierGroupSchema),
    MGS.createModifierGroup
);

modifierRouter.put("/:id",
    validation(MGV.updateModifierGroupSchema),
    MGS.updateModifierGroup
);

modifierRouter.delete("/:id",
    validation(MGV.deleteModifierGroupSchema),
    MGS.deleteModifierGroup
);

export default modifierRouter;
