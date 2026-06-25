import { Router } from "express";
import cartService from "./cart.service";
import { validation } from "../../middleware/validation";
import * as CV from "./cart.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { Role } from "../../DB/model/user.model";

const cartRouter = Router();

cartRouter.use(authentication(), authorization(Role.user));

cartRouter.get("/",
    cartService.getCart
);

cartRouter.post("/",
    validation(CV.addToCartSchema),
    cartService.addToCart
);

cartRouter.delete("/",
    cartService.clearCart
);

cartRouter.put("/:productId",
    validation(CV.updateCartSchema),
    cartService.updateItemQuantity
);

cartRouter.delete("/:productId",
    validation(CV.removeFromCartSchema),
    cartService.removeItem
);

export default cartRouter;
