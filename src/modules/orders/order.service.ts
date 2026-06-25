import { Request, Response, NextFunction } from "express";
import orderModel, { OrderStatus, OrderType, PaymentMethod } from "../../DB/model/order.model";
import cartModel from "../../DB/model/cart.model";
import productModel from "../../DB/model/product.model";
import { OrderRepo } from "../../DB/repositories/order.repo";
import { CartRepo } from "../../DB/repositories/cart.repo";
import { ProductRepo } from "../../DB/repositories/product.repo";
import { AppError } from "../../utils/AppError";
import employeeModel, { EmployeeRole } from "../../DB/model/employee.model";
import { CreateOrderInput, ListOrdersQuery, UpdateOrderStatusInput, CreateGuestOrderInput } from "./order.validation";
import { CoponRepo } from "../../DB/repositories/Copon.repo";
import coponModel from "../../DB/model/Copon.model";
import mongoose from "mongoose";

class OrderService {
    private _orderRepo = new OrderRepo(orderModel);
    private _cartRepo = new CartRepo(cartModel);
    private _productRepo = new ProductRepo(productModel);
    private _couponRepo = new CoponRepo(coponModel);

    constructor() { }

    createOrder = async (req: Request, res: Response, next: NextFunction) => {
        const {
            orderType = OrderType.delivery,
            tableNumber,
            customerName,
            discount = 0,
            shippingAddress,
            phone,
            paymentMethod = PaymentMethod.cash,
            deliveryFee: reqDeliveryFee,
            items,
            couponCode,
            notes,
            chefId
        }: CreateOrderInput = req.body;

        const session = await mongoose.startSession();
        session.startTransaction();


        try {
            if (chefId) {
                const chef = await employeeModel.findOne({ _id: chefId, role: EmployeeRole.chef, isDeleted: false }).lean();
                if (!chef) {
                    throw new AppError("Chef not found or invalid employee role", 404);
                }
            }

            let discountAmount = discount;
            let couponDoc: any = null;

            if (couponCode) {
                if (!req.user) {
                    throw new AppError("You must be logged in to use a coupon", 400);
                }
                const coupon = await this._couponRepo.findOne({ code: couponCode, isActive: true, isDeleted: false });
                if (!coupon) {
                    throw new AppError("Invalid or expired coupon code", 404);
                }

                const now = new Date();
                if (now < new Date(coupon.startDate) || now > new Date(coupon.endDate)) {
                    throw new AppError("Coupon is expired or not active yet", 400);
                }

                if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                    throw new AppError("Coupon usage limit has been reached", 400);
                }

                if (req.user && coupon.usersUsed.some((id: any) => id.toString() === req.user!._id.toString())) {
                    throw new AppError("You have already used this coupon", 400);
                }

                couponDoc = coupon;
            }

            let validatedItems = [];
            let calculatedSubTotal = 0;
            let finalUser: any = undefined;
            let finalAddress: string | undefined = undefined;
            let finalPhone: string = "";
            let finalCustomerName: string = "";
            let finalDeliveryFee = 0;

            const isEmployee = req.user && req.user.role !== "user";

            if (req.user && !isEmployee) {
                // Logged-in Customer
                const creatorId = req.user._id;
                const cart = await this._cartRepo.findOneLean({ user: creatorId } as any);
                if (!cart || cart.items.length === 0) {
                    throw new AppError("Your cart is empty", 400);
                }

                // Fetch all products at once to optimize performance
                const productIds = cart.items.map(item => item.product);
                const products = await this._productRepo.findLean({ _id: { $in: productIds }, isDeleted: false } as any);
                const productsMap = new Map(products.map(p => [p._id.toString(), p]));

                for (const item of cart.items) {
                    const product = productsMap.get(item.product.toString());
                    if (!product) {
                        throw new AppError(`One of the products in your cart is no longer available`, 404);
                    }
                    if (!product.isAvailable) {
                        throw new AppError(`Product "${product.name}" is currently unavailable or out of stock`, 400);
                    }
                    // Check if product is an expired offer
                    if (product.isOffer && product.offerEndDate && new Date(product.offerEndDate) <= new Date()) {
                        throw new AppError(`Offer "${product.name}" has expired`, 400);
                    }

                    // Use item.price from cart (already includes modifier options cost)
                    calculatedSubTotal += item.price * item.quantity;
                    validatedItems.push({
                        product: product._id,
                        quantity: item.quantity,
                        price: item.price,
                        selectedOptions: ((item as any).selectedOptions || []).map((opt: any) => ({
                            groupName: opt.groupName,
                            optionName: opt.optionName,
                            price: opt.price,
                        })),
                    });
                }

                finalUser = creatorId;
                finalCustomerName = customerName || req.user.name;
                finalPhone = phone || req.user.phone;

                if (orderType === OrderType.delivery) {
                    finalAddress = shippingAddress || req.user.addres;
                    if (!finalAddress) {
                        throw new AppError("Shipping address is required. Please provide it in checkout.", 400);
                    }
                    finalDeliveryFee = reqDeliveryFee !== undefined ? reqDeliveryFee : (cart.deliveryFee || 25);
                } else {
                    finalAddress = undefined;
                    finalDeliveryFee = 0;
                }

                if (!finalPhone) {
                    throw new AppError("Phone number is required. Please provide it in checkout.", 400);
                }
                if ((orderType === OrderType.dine_in || orderType === OrderType.takeaway) && !finalCustomerName) {
                    throw new AppError("Customer name is required.", 400);
                }
            } else {
                // Guest User (Not logged in) or Employee/Cashier placing POS order
                if (!items || items.length === 0) {
                    throw new AppError("Products list (items) is required", 400);
                }
                if (!customerName) {
                    throw new AppError("Customer name is required", 400);
                }
                if (!phone) {
                    throw new AppError("Phone number is required", 400);
                }

                // Fetch all products at once to optimize performance
                const productIds = items.map(item => item.product);
                const products = await this._productRepo.findLean({ _id: { $in: productIds }, isDeleted: false } as any);
                const productsMap = new Map(products.map(p => [p._id.toString(), p]));

                for (const item of items) {
                    const product = productsMap.get(item.product.toString());
                    if (!product) {
                        throw new AppError(`One of the products in your list is no longer available`, 404);
                    }
                    if (!product.isAvailable) {
                        throw new AppError(`Product "${product.name}" is currently unavailable`, 400);
                    }
                    // Check if product is an expired offer
                    if (product.isOffer && product.offerEndDate && new Date(product.offerEndDate) <= new Date()) {
                        throw new AppError(`Offer "${product.name}" has expired`, 400);
                    }
                    calculatedSubTotal += product.price * item.quantity;
                    validatedItems.push({
                        product: product._id,
                        quantity: item.quantity,
                        price: product.price,
                        selectedOptions: [],
                    });
                }

                finalUser = isEmployee ? (req.body.userId || undefined) : undefined;
                finalCustomerName = customerName;
                finalPhone = phone;

                if (orderType === OrderType.delivery) {
                    if (!shippingAddress) {
                        throw new AppError("Shipping address is required for delivery orders", 400);
                    }
                    finalAddress = shippingAddress;
                    finalDeliveryFee = reqDeliveryFee !== undefined ? reqDeliveryFee : 25;
                } else {
                    finalAddress = undefined;
                    finalDeliveryFee = 0;
                }
            }

            if (couponDoc) {
                if (calculatedSubTotal < couponDoc.minOrderAmount) {
                    throw new AppError(`Minimum order amount to use this coupon is ${couponDoc.minOrderAmount}`, 400);
                }
                if (couponDoc.maxOrderAmount && calculatedSubTotal > couponDoc.maxOrderAmount) {
                    throw new AppError(`Maximum order amount to use this coupon is ${couponDoc.maxOrderAmount}`, 400);
                }

                if (couponDoc.discountType === "fixed") {
                    discountAmount = couponDoc.discountValue;
                } else if (couponDoc.discountType === "percentage") {
                    discountAmount = (calculatedSubTotal * couponDoc.discountValue) / 100;
                    if (couponDoc.maxDiscountAmount && discountAmount > couponDoc.maxDiscountAmount) {
                        discountAmount = couponDoc.maxDiscountAmount;
                    }
                }
                discountAmount = Math.min(discountAmount, calculatedSubTotal);
            }

            const calculatedTotalPrice = Math.max((calculatedSubTotal - discountAmount), 0) + finalDeliveryFee;

            const lastOrder = await orderModel.findOne({}, {}, { session }).sort({ createdAt: -1 }).lean();
            const nextOrderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1000;

            const orderData: any = {
                orderNumber: nextOrderNumber,
                notes: notes || "",
                user: finalUser,
                cashier: isEmployee ? req.user!._id : undefined,
                chef: chefId || undefined,
                items: validatedItems,
                orderType,
                discount: discountAmount,
                deliveryFee: finalDeliveryFee,
                subTotal: calculatedSubTotal,
                totalPrice: calculatedTotalPrice,
                phone: finalPhone,
                paymentMethod: paymentMethod,
                status: isEmployee ? OrderStatus.preparing : OrderStatus.pending,
            };

            if (orderType === OrderType.dine_in && tableNumber) {
                orderData.tableNumber = tableNumber;
            }
            if (orderType === OrderType.dine_in || orderType === OrderType.takeaway || (orderType === OrderType.delivery && finalCustomerName)) {
                orderData.customerName = finalCustomerName;
            }
            if (finalAddress) {
                orderData.shippingAddress = finalAddress;
            }

            if (couponDoc) {
                orderData.coupon = couponDoc._id;
            }

            const order = await this._orderRepo.create(orderData, { session });

            if (couponDoc) {
                couponDoc.usageCount += 1;
                if (req.user && !isEmployee) {
                    couponDoc.usersUsed.push(req.user._id);
                }
                await couponDoc.save({ session });
            }

            if (req.user && !isEmployee) {
                await this._cartRepo.updateOne({ user: req.user._id } as any, {
                    $set: {
                        items: [],
                        subTotal: 0,
                        deliveryFee: 25,
                        totalPrice: 25
                    }
                },
                    { session }
                )
            }

            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({ message: "Order created successfully", order });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            next(error);
        }
    };

    getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!._id;
        const orders = await this._orderRepo.findUserOrders(userId as any);
        return res.status(200).json({ message: "success", orders });
    };

    listAllOrders = async (req: Request, res: Response, next: NextFunction) => {
        const { page = "1", limit = "20", status, orderType }: ListOrdersQuery = req.query as unknown as ListOrdersQuery;

        const filter: Record<string, any> = {};
        if (status) filter.status = status;
        if (orderType) filter.orderType = orderType;

        const { orders, total } = await this._orderRepo.findAllOrders(filter, Number(page), Number(limit));

        return res.status(200).json({
            message: "success",
            data: orders,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    };

    getOrderById = async (req: Request, res: Response, next: NextFunction) => {
        const { orderId } = req.params as unknown as { orderId: string };
        const userId = req.user!._id;
        const role = req.user!.role;

        const order = await this._orderRepo.findOrderById(orderId);
        if (!order) {
            throw new AppError("Order not found", 404);
        }

        const isStaff = (role as string) === EmployeeRole.manager || (role as string) === EmployeeRole.cashier;
        if (!isStaff && (!order.user || order.user._id.toString() !== userId.toString())) {
            throw new AppError("Not authorized to view this order", 403);
        }

        return res.status(200).json({ message: "success", order });
    };

    updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
        const { orderId } = req.params as unknown as { orderId: string };
        const { status, chefId }: UpdateOrderStatusInput = req.body;

        const order = await this._orderRepo.findById(orderId);
        if (!order) {
            throw new AppError("Order not found", 404);
        }

        const updateData: any = { status };
        if (chefId) {
            const chef = await employeeModel.findOne({ _id: chefId, role: EmployeeRole.chef, isDeleted: false }).lean();
            if (!chef) {
                throw new AppError("Chef not found or invalid employee role", 404);
            }
            updateData.chef = chefId;
        }

        if (req.user && req.user.role !== "user") {
            updateData.cashier = req.user._id;
        }

        await this._orderRepo.updateOne({ _id: orderId } as any, { $set: updateData });
        const updatedOrder = await this._orderRepo.findById(orderId);

        return res.status(200).json({ message: "Order status updated", order: updatedOrder });
    };

    getKitchenOrders = async (req: Request, res: Response, next: NextFunction) => {
        let chefId: string | undefined = undefined;
        if (req.user && (req.user.role as string) === EmployeeRole.chef) {
            chefId = req.user._id.toString();
        } else if (req.query.chefId) {
            chefId = req.query.chefId as string;
        }
        const orders = await this._orderRepo.findKitchenOrders(chefId);
        return res.status(200).json({ message: "success", orders });
    };

    createGuestOrder = async (req: Request, res: Response, next: NextFunction) => {
        const { tableNumber, customerName, phone, paymentMethod, items, notes }: CreateGuestOrderInput = req.body;

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const validatedItems = [];
            let calculatedSubTotal = 0;

            // Fetch all products at once to optimize performance
            const productIds = items.map(item => item.product);
            const products = await this._productRepo.findLean({ _id: { $in: productIds }, isDeleted: false } as any);
            const productsMap = new Map(products.map(p => [p._id.toString(), p]));

            for (const item of items) {
                const product = productsMap.get(item.product.toString());
                if (!product) {
                    throw new AppError(`One of the products in your list is no longer available`, 404);
                }
                if (!product.isAvailable) {
                    throw new AppError(`Product "${product.name}" is currently unavailable`, 400);
                }
                // Check if product is an expired offer
                if (product.isOffer && product.offerEndDate && new Date(product.offerEndDate) <= new Date()) {
                    throw new AppError(`Offer "${product.name}" has expired`, 400);
                }

                calculatedSubTotal += product.price * item.quantity;
                validatedItems.push({
                    product: product._id,
                    quantity: item.quantity,
                    price: product.price,
                    selectedOptions: [],
                });
            }

            const lastOrder = await orderModel.findOne({}, {}, { session }).sort({ createdAt: -1 }).lean();
            const nextOrderNumber = lastOrder && lastOrder.orderNumber ? lastOrder.orderNumber + 1 : 1000;

            const orderData = {
                orderNumber: nextOrderNumber,
                notes: notes || "",
                items: validatedItems,
                orderType: OrderType.dine_in,
                tableNumber,
                customerName,
                discount: 0,
                deliveryFee: 0,
                subTotal: calculatedSubTotal,
                totalPrice: calculatedSubTotal,
                phone,
                paymentMethod,
                status: OrderStatus.pending,
            };

            const order = await this._orderRepo.create(orderData, { session });

            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({ message: "Guest order created successfully", order });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            next(error);
        }
    };
}

export default new OrderService();