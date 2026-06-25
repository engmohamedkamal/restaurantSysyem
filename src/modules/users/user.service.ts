import { Request, Response, NextFunction } from "express";
import { confirmEmailSchemaType, signInSchemaType, signupSchemaType } from "./user.validaiton"
import userModel, { proveidorType } from "../../DB/model/user.model";
import orderModel from "../../DB/model/order.model";
import { UserRepo } from "../../DB/repositories/user.repo";
import { OrderRepo } from "../../DB/repositories/order.repo";
import { AppError } from "../../utils/AppError";
import { Hash } from "../../utils/hash";
import { generateRandomCode } from "../../service/sendEmail";
import { compare } from "bcrypt";
import { generateToken, verifyToken } from "../../utils/token";
import { v4 as uuidv4 } from "uuid";
import RevokeToken from "../../DB/model/revokeToken.model ";
import { revokeTokenRepo } from "../../DB/repositories/revokeToken.repo";
import { OAuth2Client } from "google-auth-library";
import { emailQueue } from "../../queues/email.queues";
import redis from "../../utils/redis";
import employeeModel from "../../DB/model/employee.model";

class UserService {
    private _userModel = new UserRepo(userModel)
    private _RevokeToken = new revokeTokenRepo(RevokeToken)
    private _orderRepo = new OrderRepo(orderModel)

    constructor() { }
    signUp = async (req: Request, res: Response, next: NextFunction) => {
        const { name, email, addres, password, cPassword, phone }: signupSchemaType = req.body

        if (await this._userModel.findOne({ email })) {
            throw new AppError("user already exists", 409)
        }

        const hashPassword = await Hash(password)
        const otp = await generateRandomCode()
        const hashOtp = await Hash(String(otp))
        // const otpExpiration = new Date(Date.now() + 3 * 60 * 1000)
        const user = await this._userModel.createOneUser({
            name,
            email,
            password: hashPassword,
            phone,
            addres,
            // otp: hashOtp,
            // otpExpiration
        })
        // eventEmitter.emit("confirmEmail", { email, otp })
        await redis.set(`otp-${email}`, hashOtp, "EX", 180)
        await emailQueue.add("send-otp", { email, otp })
        return res.status(200).json({ message: "success", user })
    };

    confirmEmail = async (req: Request, res: Response, next: NextFunction) => {

        const { email, otp }: confirmEmailSchemaType = req.body
        const user = await this._userModel.findOne({ email, isVerified: false })

        if (!user) throw new AppError("user not found or is verified", 401)

        const saveOtp = await redis.get(`otp-${email}`)

        if (!saveOtp) throw new AppError("OTP expired", 401)

        // if (user.otpExpiration && user.otpExpiration < new Date()) {
        //     throw new AppError("OTP expired", 401) 
        // }

        if (!await compare(otp, saveOtp)) throw new AppError("invaild code", 401)

        await this._userModel.updateOne({ email: user?.email }, { isVerified: true, $unset: { otp: "", otpExpiration: "" } })
        return res.status(200).json({ message: "confrim email success" })

    };

    resendOtp = async (req: Request, res: Response, next: NextFunction) => {
        const { email }: { email: string } = req.body
        const user = await this._userModel.findOne({ email, isVerified: false })

        if (!user) throw new AppError("user not found or already verified", 404)

        const saveOtp = await redis.get(`otp-${email}`)
        if (saveOtp) {
            throw new AppError("OTP is still valid, please wait until it expires", 400)
        }

        const otp = await generateRandomCode()
        const hashOtp = await Hash(String(otp))

        await redis.set(`otp-${email}`, hashOtp, "EX", 180)

        // eventEmitter.emit("confirmEmail", { email, otp })
        await emailQueue.add("send-otp", { email, otp })
        return res.status(200).json({ message: "new OTP sent successfully" })
    };

    signIn = async (req: Request, res: Response, next: NextFunction) => {
        const { email, password }: signInSchemaType = req.body
        let account = await this._userModel.findOne({ email, isVerified: true, proveidorType: proveidorType.system }) as any
        if (!account) {
            account = await employeeModel.findOne({ email, isDeleted: false }) as any
            if (!account) {
                throw new AppError("user not found or not verified", 404)
            }
            if (!account.isActive) {
                throw new AppError("Employee account is inactive", 403)
            }
        }
        if (!await compare(password, account.password!)) throw new AppError("invaild password", 401)
        const jwtid = uuidv4();
        //access token
        const access_token = await generateToken({
            payload: { id: account._id, role: account.role, name: account.name },
            signature: process.env.ACCESS_TOKEN!,
            options: { expiresIn: "3d", jwtid }
        })

        //refresh token
        const refresh_token = await generateToken({
            payload: { id: account._id, role: account.role, name: account.name },
            signature: process.env.REFRESH_TOKEN!,
            options: { expiresIn: "30d", jwtid }
        })
        res.cookie("refresh_token", refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24 * 30,
        })
        return res.status(200).json({ message: "success", access_token, role: account.role, name: account.name })
    };

    signInWithGoogle = async (req: Request, res: Response, next: NextFunction) => {

        const { idToken } = req.body

        const client = new OAuth2Client();
        async function verify() {
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.WEB_CLIENT_ID!,
            });
            const payload = ticket.getPayload();
            if (!payload) throw new AppError("Invalid Google token", 401)
            return payload
        }
        const { name, email, email_verified } = await verify()

        if (!email) throw new AppError("email not found in Google token", 401)

        let user = await this._userModel.findOne({ email })
        if (!user) {
            user = await this._userModel.create({
                email,
                name: name ?? email.split("@")[0] ?? "Google User",
                isVerified: email_verified ?? false,
                addres: "",
                phone: "",
                proveidorType: proveidorType.google,
            })
        }
        if (user.proveidorType != proveidorType.google) throw new AppError("please login on system", 401)
        const jwtid = uuidv4()
        const access_token = await generateToken({
            payload: { id: user._id, role: user.role, name: user.name },
            signature: process.env.ACCESS_TOKEN!,
            options: { expiresIn: "3d", jwtid }
        })

        const refresh_token = await generateToken({
            payload: { id: user._id, role: user.role, name: user.name },
            signature: process.env.REFRESH_TOKEN!,
            options: { expiresIn: "30d", jwtid }
        })

        res.cookie("refresh_token", refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24 * 30,
        })

        return res.status(200).json({ message: "success", access_token, role: user.role, name: user.name })
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {

        const refresh_token = req.cookies?.refresh_token;
        if (!refresh_token) throw new AppError("refresh token required", 401);

        const decoded = await verifyToken({
            token: refresh_token,
            signature: process.env.REFRESH_TOKEN!,
        });

        if (!decoded?.id) throw new AppError("invalid refresh token", 401);

        if (decoded?.jti && (await this._RevokeToken.findOne({ tokenId: decoded.jti }))) {
            throw new AppError("token has been revoked", 401);
        }

        let account = await this._userModel.findById(decoded.id) as any;
        if (!account) {
            account = await employeeModel.findById(decoded.id) as any;
        }
        if (!account) throw new AppError("user not exist", 401);

        if (account?.changCredentials?.getTime() && decoded?.iat) {
            if (account.changCredentials.getTime() > decoded.iat * 1000) {
                throw new AppError("token has been revoked", 401);
            }
        }

        if (account.isDeleted) throw new AppError("الحساب مجمد", 403);

        const jwtid = uuidv4();
        const access_token = await generateToken({
            payload: { id: account._id, role: account.role, name: account.name },
            signature: process.env.ACCESS_TOKEN!,
            options: { expiresIn: "3d", jwtid },
        });


        const new_refresh_token = await generateToken({
            payload: { id: account._id, role: account.role, name: account.name },
            signature: process.env.REFRESH_TOKEN!,
            options: { expiresIn: "30d", jwtid },
        });

        if (decoded?.jti) {
            await this._RevokeToken.createOne({
                userId: account._id,
                tokenId: decoded.jti,
                expireAt: new Date((decoded.exp as number) * 1000),
            });
        }

        res.cookie("refresh_token", new_refresh_token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        return res.status(200).json({ message: "success", access_token, role: account.role, name: account.name });

    };

    logout = async (req: Request, res: Response, next: NextFunction) => {
        const revokeToken = await this._RevokeToken.createOne({
            userId: req.user!._id,
            tokenId: req.decoded!.jti!,
            expireAt: new Date((req.decoded!.exp as number) * 1000),
        })

        res.clearCookie("refresh_token", {
            httpOnly: true,
            sameSite: "none",
            secure: true,
        });

        return res.status(200).json({ message: "تم تسجيل الخروج بنجاح" })
    };

    forgetPassword = async (req: Request, res: Response, next: NextFunction) => {
        const { email }: { email: string } = req.body
        const user = await this._userModel.findOne({ email, isVerified: true })
        if (!user) throw new AppError("user not found", 404)

        const saveOtp = await redis.get(`otp-${email}`)
        if (saveOtp) {
            throw new AppError("OTP is still valid, please wait until it expires", 400)
        }

        const otp = await generateRandomCode()
        const hashOtp = await Hash(String(otp))

        await redis.set(`otp-${email}`, hashOtp, "EX", 180)

        // eventEmitter.emit("confirmEmail", { email, otp })
        await emailQueue.add("send-otp", { email, otp })
        return res.status(200).json({ message: "new OTP sent successfully" })
    };

    resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp, password }: { email: string, otp: string, password: string } = req.body

        const user = await this._userModel.findOne({ email, isVerified: true })

        if (!user) throw new AppError("user not found", 404)

        const saveOtp = await redis.get(`otp-${email}`)
        if (!saveOtp) throw new AppError("OTP is expired", 400)

        if (!await compare(otp, saveOtp)) throw new AppError("invaild OTP", 401)

        const hashPassword = await Hash(password)
        await this._userModel.updateOne({ email }, { password: hashPassword, changCredentials: new Date() })
        await redis.del(`otp-${email}`)

        return res.status(200).json({ message: "password reset successfully" })
    };

    getCustomerDashboard = async (req: Request, res: Response, next: NextFunction) => {
        const { userId } = req.params as { userId: string };
        const user = await this._userModel.findById(userId);
        if (!user) throw new AppError("User not found", 404);

        const orders = await this._orderRepo.findUserDashboardOrders(userId);

        const totalOrders = orders.length;
        const totalSpent = orders.reduce((acc, order) => acc + order.totalPrice, 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        const recentOrders = orders.slice(0, 5).map(order => ({
            orderId: order._id,
            date: order.createdAt,
            totalPrice: order.totalPrice
        }));

        return res.status(200).json({
            message: "success",
            customer: {
                id: user._id,
                name: user.name,
                phone: user.phone,
                address: user.addres,
                email: user.email,
                specialNotes: user.specialNotes,
            },
            analytics: {
                totalOrders,
                totalSpent,
                averageOrderValue: Number(averageOrderValue.toFixed(2))
            },
            recentOrders
        });
    };

    updateSpecialNotes = async (req: Request, res: Response, next: NextFunction) => {
        const { userId } = req.params;
        const { specialNotes } = req.body;

        // Either the user themselves, or a manager/cashier can update it
        if (req.user!.role === "user" && req.user!._id.toString() !== userId) {
            throw new AppError("Not authorized to update this profile", 403);
        }

        await this._userModel.updateOne({ _id: userId as any }, { specialNotes });
        return res.status(200).json({ message: "Notes updated successfully", specialNotes });
    };

    getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
        const { page = 1, limit = 20 } = req.query;

        const { users, total } = await this._userModel.findAllUsers(Number(page), Number(limit));

        return res.status(200).json({
            message: "success",
            data: users,
            pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
        });
    };

    getUserById = async (req: Request, res: Response, next: NextFunction) => {
        const { userId } = req.params as { userId: string };
        const user = await this._userModel.findById(userId, "-password");
        if (!user) throw new AppError("User not found", 404);

        return res.status(200).json({ message: "success", user });
    };
}

export default new UserService()