import { Router } from "express";
import CS from "./category.service";
import { validation } from "../../middleware/validation";
import * as CV from "./category.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { MulterHost, allowedExtensions } from "../../middleware/multer";

const categoryRouter = Router();

const upload = MulterHost({ customExtension: allowedExtensions.image, fileSizeMB: 5 });

// Public Read Routes (For customers scanning QR and POS dashboard)
categoryRouter.get("/",
    validation(CV.listCategoriesSchema),
    CS.getCategories
);

categoryRouter.get("/:id",
    validation(CV.getCategorySchema),
    CS.getCategoryById
);

// Protected Write/Edit/Delete Routes (Manager Only)
categoryRouter.use(authentication(), authorization("manager"));

categoryRouter.post("/",
    upload.single("image"),
    validation(CV.createCategorySchema),
    CS.createCategory
);

categoryRouter.put("/:id",
    upload.single("image"),
    validation(CV.updateCategorySchema),
    CS.updateCategory
);

categoryRouter.patch("/:id/status",
    validation(CV.toggleStatusSchema),
    CS.toggleStatus
);

categoryRouter.delete("/:id",
    validation(CV.deleteCategorySchema),
    CS.deleteCategory
);

export default categoryRouter;
