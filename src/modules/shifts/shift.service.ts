import { Request, Response, NextFunction } from "express";
import shiftModel from "../../DB/model/shift.model";
import orderModel, { OrderStatus, PaymentMethod } from "../../DB/model/order.model";
import expenseModel from "../../DB/model/expense.model";
import employeeModel, { EmployeeRole } from "../../DB/model/employee.model";
import { AppError } from "../../utils/AppError";
import { StartShiftInput, EndShiftInput } from "./shift.validation";
import mongoose from "mongoose";
import { ShiftRepo } from "../../DB/repositories/shift.repo";



class ShiftService {
    private _shiftRepo = new ShiftRepo(shiftModel)

    startShift = async (req: Request, res: Response, next: NextFunction) => {
        const { startCash, notes }: StartShiftInput = req.body;
        const employeeId = req.user!._id;
        const role = req.user!.role;

        // Check if there is an active shift
        const activeShift = await this._shiftRepo.findOneLean({ employee: employeeId, isActive: true });
        if (activeShift) {
            throw new AppError("You already have an active shift. Please end it first.", 400);
        }

        const newShift = await this._shiftRepo.create({
            employee: employeeId,
            role: role as string,
            startTime: new Date(),
            isActive: true,
            startCash,
            ...(notes ? { notes } : {})
        } as any);

        return res.status(201).json({
            message: "Shift started successfully",
            shift: newShift
        });
    };

    endShift = async (req: Request, res: Response, next: NextFunction) => {
        const { endCash, notes }: EndShiftInput = req.body;
        const employeeId = req.user!._id;

        const activeShift = await this._shiftRepo.findOne({ employee: employeeId, isActive: true });
        if (!activeShift) {
            throw new AppError("You do not have an active shift to end.", 404);
        }

        // Calculate expected end cash
        const stats = await this.calculateShiftStats(activeShift.employee.toString(), activeShift.startTime, new Date(), activeShift._id.toString());

        const expectedEndCash = Math.max(activeShift.startCash + stats.cashRevenue - stats.cashExpenses, 0);

        activeShift.isActive = false;
        activeShift.endTime = new Date();
        activeShift.endCash = endCash;
        activeShift.expectedEndCash = expectedEndCash;
        if (notes) {
            activeShift.notes = notes;
        }

        await activeShift.save();

        const difference = endCash - expectedEndCash;

        return res.status(200).json({
            message: "Shift ended successfully",
            shift: activeShift,
            summary: {
                totalOrders: stats.totalOrders,
                totalRevenue: stats.totalRevenue,
                cashRevenue: stats.cashRevenue,
                cardRevenue: stats.cardRevenue,
                cashExpenses: stats.cashExpenses,
                expectedEndCash,
                actualEndCash: endCash,
                difference,
                status: difference === 0 ? "balanced" : difference > 0 ? "surplus" : "shortage"
            }
        });
    };

    getCurrentShiftStats = async (req: Request, res: Response, next: NextFunction) => {
        const employeeId = req.user!._id;

        const activeShift = await this._shiftRepo.findOneLean({ employee: employeeId, isActive: true });
        if (!activeShift) {
            throw new AppError("No active shift found for you.", 404);
        }

        const stats = await this.calculateShiftStats(employeeId.toString(), activeShift.startTime, new Date(), activeShift._id.toString());
        const expectedEndCash = Math.max(activeShift.startCash + stats.cashRevenue - stats.cashExpenses, 0);

        return res.status(200).json({
            message: "success",
            shift: activeShift,
            liveStats: {
                ...stats,
                expectedEndCash
            }
        });
    };

    getShiftDetails = async (req: Request, res: Response, next: NextFunction) => {
        const { shiftId } = req.params;

        const shift = await this._shiftRepo.findByIdWithEmployee(shiftId);
        if (!shift) {
            throw new AppError("Shift not found", 404);
        }

        const stats = await this.calculateShiftStats(
            shift.employee._id.toString(),
            shift.startTime,
            shift.endTime || new Date(),
            shift._id.toString()
        );

        return res.status(200).json({
            message: "success",
            shift,
            stats
        });
    };

    getDashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
        // Manager only
        const activeShifts = await this._shiftRepo.findActiveShiftsWithEmployee();

        // Calculate sales today (last 24 hours)
        const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // 1. Total revenue and counts in last 24h
        const salesAggregation = await orderModel.aggregate([
            { $match: { createdAt: { $gte: past24Hours } } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$totalPrice" },
                    totalOrders: { $sum: 1 },
                    cashSales: {
                        $sum: { $cond: [{ $eq: ["$paymentMethod", PaymentMethod.cash] }, "$totalPrice", 0] }
                    },
                    cardSales: {
                        $sum: { $cond: [{ $eq: ["$paymentMethod", PaymentMethod.card] }, "$totalPrice", 0] }
                    }
                }
            }
        ]);

        // 2. Sales per cashier in last 24h
        const cashierSales = await orderModel.aggregate([
            { $match: { createdAt: { $gte: past24Hours }, cashier: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$cashier",
                    totalSales: { $sum: "$totalPrice" },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "_id",
                    foreignField: "_id",
                    as: "cashierInfo"
                }
            },
            { $unwind: "$cashierInfo" },
            {
                $project: {
                    cashierId: "$_id",
                    name: "$cashierInfo.name",
                    username: "$cashierInfo.username",
                    totalSales: 1,
                    orderCount: 1
                }
            }
        ]);

        // 3. Chef workloads
        const chefWorkload = await orderModel.aggregate([
            { $match: { status: OrderStatus.preparing, chef: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$chef",
                    pendingPrepCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "employees",
                    localField: "_id",
                    foreignField: "_id",
                    as: "chefInfo"
                }
            },
            { $unwind: "$chefInfo" },
            {
                $project: {
                    chefId: "$_id",
                    name: "$chefInfo.name",
                    username: "$chefInfo.username",
                    pendingPrepCount: 1
                }
            }
        ]);

        // 4. Recent expenses in last 24 hours
        const expensesSum = await expenseModel.aggregate([
            { $match: { createdAt: { $gte: past24Hours } } },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: "$amount" }
                }
            }
        ]);

        const recentExpenses = await expenseModel.find({ createdAt: { $gte: past24Hours } })
            .populate("paidBy", "name username")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        return res.status(200).json({
            message: "success",
            overview: {
                activeShiftsCount: activeShifts.length,
                activeShifts,
                summary24h: {
                    totalSales: salesAggregation[0]?.totalSales || 0,
                    totalOrders: salesAggregation[0]?.totalOrders || 0,
                    cashSales: salesAggregation[0]?.cashSales || 0,
                    cardSales: salesAggregation[0]?.cardSales || 0,
                    totalExpenses: expensesSum[0]?.totalExpenses || 0,
                    netCash: (salesAggregation[0]?.cashSales || 0) - (expensesSum[0]?.totalExpenses || 0)
                },
                cashierPerformance24h: cashierSales,
                chefActiveWorkload: chefWorkload,
                recentExpenses24h: recentExpenses
            }
        });
    };

    private calculateShiftStats = async (employeeId: string, startTime: Date, endTime: Date, shiftId: string) => {
        const empObjectId = new mongoose.Types.ObjectId(employeeId);
        const shiftObjectId = new mongoose.Types.ObjectId(shiftId);

        // Fetch Cashier Orders (POS orders created by cashier)
        const orderStats = await orderModel.aggregate([
            {
                $match: {
                    cashier: empObjectId,
                    createdAt: { $gte: startTime, $lte: endTime }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$totalPrice" },
                    cashRevenue: {
                        $sum: { $cond: [{ $eq: ["$paymentMethod", PaymentMethod.cash] }, "$totalPrice", 0] }
                    },
                    cardRevenue: {
                        $sum: { $cond: [{ $eq: ["$paymentMethod", PaymentMethod.card] }, "$totalPrice", 0] }
                    }
                }
            }
        ]);

        // Fetch Chef Orders (Dine-in / takeaway orders prepared by chef)
        const chefStats = await orderModel.countDocuments({
            chef: empObjectId,
            updatedAt: { $gte: startTime, $lte: endTime },
            status: { $in: [OrderStatus.delivered, OrderStatus.delivering] }
        });

        // Fetch Expenses paid during shift
        const expenseStats = await expenseModel.aggregate([
            {
                $match: {
                    $or: [
                        { shiftId: shiftObjectId },
                        { paidBy: empObjectId, createdAt: { $gte: startTime, $lte: endTime } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: "$amount" }
                }
            }
        ]);

        return {
            totalOrders: orderStats[0]?.totalOrders || 0,
            totalRevenue: orderStats[0]?.totalRevenue || 0,
            cashRevenue: orderStats[0]?.cashRevenue || 0,
            cardRevenue: orderStats[0]?.cardRevenue || 0,
            chefOrdersPrepared: chefStats,
            cashExpenses: expenseStats[0]?.totalExpenses || 0
        };
    };
}

export default new ShiftService();
