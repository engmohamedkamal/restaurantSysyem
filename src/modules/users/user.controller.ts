import { Router } from "express";
import US from "./user.service"
import { validation } from "../../middleware/validation";
import * as UV from "./user.validaiton";
import { authentication } from "../../middleware/authentication";
import { authorization } from "../../middleware/authorization";
import { Role } from "../../DB/model/user.model";
import { EmployeeRole } from "../../DB/model/employee.model";

const userRouter = Router()

userRouter.post("/signUp",
    validation(UV.singUpSchema),
    US.signUp)

userRouter.post("/signIn",
    validation(UV.signInSchema),
    US.signIn)

userRouter.post("/signInWithGoogle",
    validation(UV.signInWithGoogleSchema),
    US.signInWithGoogle)

userRouter.patch("/confirmEmail",
    validation(UV.confirmEmailSchema),
    US.confirmEmail)

userRouter.patch("/resendOtp",
    validation(UV.resendOtpSchema),
    US.resendOtp)

userRouter.get("/refreshToken",
    US.refreshToken)

userRouter.post("/logout",
    authentication(),
    US.logout)

userRouter.patch("/forgetPassword",
    validation(UV.forgetPasswordSchema),
    US.forgetPassword)

userRouter.patch("/resetPassword",
    validation(UV.resetPasswordSchema),
    US.resetPassword)

userRouter.get("/",
    authentication(),
    authorization(Role.manager, EmployeeRole.cashier),
    US.getAllUsers)

userRouter.get("/:userId",
    authentication(),
    authorization(Role.manager, EmployeeRole.cashier),
    US.getUserById)

userRouter.get("/:userId/dashboard",
    authentication(),
    authorization(Role.manager, EmployeeRole.cashier, Role.user),
    US.getCustomerDashboard)

userRouter.patch("/:userId/notes",
    authentication(),
    authorization(Role.manager, EmployeeRole.cashier, Role.user),
    validation(UV.updateSpecialNotesSchema),
    US.updateSpecialNotes)

export default userRouter