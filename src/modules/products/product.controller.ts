import { Router } from "express";
import PS from "./product.service";
import { validation } from "../../middleware/validation";
import * as PV from "./product.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { MulterHost, allowedExtensions } from "../../middleware/multer";

const productRouter = Router();

const upload = MulterHost({ customExtension: allowedExtensions.image, fileSizeMB: 5 });

productRouter.get("/",
    validation(PV.listProductsSchema),
    PS.listProducts
);

productRouter.get("/:id",
    validation(PV.getProductSchema),
    PS.getProduct
);

productRouter.use(authentication(), authorization("manager"));

productRouter.post("/",
    upload.single("image"),
    validation(PV.createProductSchema),
    PS.createProduct
);

productRouter.put("/:id",
    upload.single("image"),
    validation(PV.updateProductSchema),
    PS.updateProduct
);

productRouter.patch("/:id/status",
    validation(PV.toggleStatusSchema),
    PS.toggleStatus
);

productRouter.delete("/:id",
    validation(PV.deleteProductSchema),
    PS.deleteProduct
);

export default productRouter;
