import { Router } from "express";
import CoponService from "./Copon.service";
import { validation } from "../../middleware/validation";
import * as CV from "./Copon.validation";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";

const couponRouter = Router();

couponRouter.use(authentication(), authorization("manager"));

couponRouter.post("/",
    validation(CV.createCoupon),
    CoponService.createCopon
);

couponRouter.get("/",
    validation(CV.listCoupons),
    CoponService.getCoupons
);

couponRouter.get("/:couponId",
    validation(CV.getCouponById),
    CoponService.getCouponById
);

couponRouter.put("/:couponId",
    validation(CV.updateCoupon),
    CoponService.updateCopon
);

couponRouter.delete("/:couponId",
    validation(CV.getCouponById),
    CoponService.deleteCopon
);

couponRouter.get("/:couponId/stats",
    validation(CV.getCouponById),
    CoponService.getCouponById
);

export default couponRouter;
