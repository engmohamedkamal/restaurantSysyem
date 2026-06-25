import { Request, Response, NextFunction } from "express";
import { CreateCouponInput, UpdateCouponInput, ListCouponsQuery } from "./Copon.validation";
import { CoponRepo } from "../../DB/repositories/Copon.repo";
import coponModel, { discountType } from "../../DB/model/Copon.model";
import orderModel from "../../DB/model/order.model";
import { AppError } from "../../utils/AppError";


class CoponService {
    private _CoponRepo = new CoponRepo(coponModel);
    constructor() {}
    
    createCopon = async (req: Request, res: Response, next: NextFunction) => {
        const {code, discountType: typeInput, discountValue, minOrderAmount, maxOrderAmount, maxDiscountAmount, startDate, endDate, usageLimit} : CreateCouponInput = req.body;
        
        const existingCoupon = await this._CoponRepo.findOne({code, isDeleted: false})
        if(existingCoupon) throw new AppError("Coupon already exists", 409)

        if(startDate > endDate) throw new AppError("startDate must be before endDate", 400)
                
        const newCoupon = await this._CoponRepo.create({
            code,
            discountType: typeInput as discountType,
            discountValue,
            minOrderAmount,
            maxOrderAmount,
            maxDiscountAmount,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            usageLimit,
            createdBy: (req as any).user._id 
        });

        return res.status(201).json({
            message: "Coupon created successfully",
            coupon: newCoupon
        });
    }

    getCoupons = async (req: Request, res: Response, next: NextFunction) => {
        const { page = "1", limit = "20", isActive }: ListCouponsQuery = req.query as unknown as ListCouponsQuery;

        const filter: any = { isDeleted: false };
        if (isActive !== undefined) {
            filter.isActive = isActive === "true";
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const [coupons, total] = await Promise.all([
            coponModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            coponModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            message: "Success",
            data: coupons,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }

    getCouponById = async (req: Request, res: Response, next: NextFunction) => {
        const { couponId } = req.params as unknown as { couponId: string };

        const coupon = await this._CoponRepo.findOne({ _id: couponId, isDeleted: false });
        if (!coupon) {
            throw new AppError("Coupon not found", 404);
        }

        const statsResult = await orderModel.aggregate([
            { $match: { coupon: coupon._id } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalDiscountGiven: { $sum: "$discount" },
                    uniqueUsersCount: { $addToSet: "$user" }
                }
            }
        ]);

        const totalOrders = statsResult[0]?.totalOrders || 0;
        const totalDiscountGiven = statsResult[0]?.totalDiscountGiven || 0;
        const uniqueUsersCount = statsResult[0]?.uniqueUsersCount?.length || 0;

        const recentOrders = await orderModel.find({ coupon: coupon._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("user", "name email phone")
            .lean();

        return res.status(200).json({
            message: "Success",
            coupon,
            stats: {
                totalOrders,
                totalDiscountGiven,
                uniqueUsersCount,
                recentOrders
            }
        });
    }

    updateCopon = async (req: Request, res: Response, next: NextFunction) => {
        const { couponId } = req.params as unknown as { couponId: string };
        const updates: UpdateCouponInput = req.body;

        const coupon = await this._CoponRepo.findOne({ _id: couponId, isDeleted: false });
        if (!coupon) {
            throw new AppError("Coupon not found", 404);
        }

        if (updates.code && updates.code !== coupon.code) {
            const codeExists = await this._CoponRepo.findOne({ code: updates.code, isDeleted: false });
            if (codeExists) {
                throw new AppError("Coupon code already in use by another coupon", 409);
            }
        }

        const newStartDate = updates.startDate ? new Date(updates.startDate) : coupon.startDate;
        const newEndDate = updates.endDate ? new Date(updates.endDate) : coupon.endDate;
        if (newStartDate > newEndDate) {
            throw new AppError("startDate must be before endDate", 400);
        }

        Object.assign(coupon, {
            ...updates,
            startDate: updates.startDate ? new Date(updates.startDate) : coupon.startDate,
            endDate: updates.endDate ? new Date(updates.endDate) : coupon.endDate,
        });

        const updatedCoupon = await coupon.save();

        return res.status(200).json({
            message: "Coupon updated successfully",
            coupon: updatedCoupon
        });
    }

    deleteCopon = async (req: Request, res: Response, next: NextFunction) => {
        const { couponId } = req.params as unknown as { couponId: string };

        const coupon = await this._CoponRepo.findOne({ _id: couponId, isDeleted: false });
        if (!coupon) {
            throw new AppError("Coupon not found or already deleted", 404);
        }

        coupon.isDeleted = true;
        await coupon.save();

        return res.status(200).json({
            message: "Coupon deleted successfully"
        });
    }
}

export default new CoponService();