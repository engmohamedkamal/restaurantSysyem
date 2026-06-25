import { HydratedDocument, Model, ProjectionType, QueryFilter } from "mongoose";
import { IOrder, OrderStatus } from "../model/order.model";
import { DBRepo } from "./DB.repo";

export class OrderRepo extends DBRepo<IOrder> {
    constructor(protected readonly model: Model<IOrder>) {
        super(model);
    }

    async findUserOrders(userId: string): Promise<HydratedDocument<IOrder>[]> {
        return this.model.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate("items.product", "name image")
            .populate("coupon", "code discountType discountValue");
    }

    async findUserDashboardOrders(userId: string): Promise<HydratedDocument<IOrder>[]> {
        return this.model.find({ user: userId, status: { $ne: OrderStatus.cancelled } }).sort({ createdAt: -1 }) as any;
    }

    async findOrderById(orderId: string): Promise<HydratedDocument<IOrder> | null> {
        return this.model.findById(orderId)
            .populate("items.product", "name image")
            .populate("user", "name email phone")
            .populate("cashier", "name username")
            .populate("coupon");
    }

    async findAllOrders(
        filter: QueryFilter<IOrder>,
        page: number = 1,
        limit: number = 20
    ): Promise<{ orders: HydratedDocument<IOrder>[]; total: number }> {
        const safeLimit = Math.min(Math.max(limit, 1), 100);
        const skip = (Math.max(page, 1) - 1) * safeLimit;

        const [orders, total] = await Promise.all([
            this.model
                .find(filter)
                .populate("user", "name phone")
                .populate("cashier", "name username")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(safeLimit),
            this.model.countDocuments(filter),
        ]);
        return { orders, total };
    }

    async findKitchenOrders(chefId?: string): Promise<IOrder[]> {
        const query: any = { status: OrderStatus.preparing };
        if (chefId) {
            query.chef = chefId;
        }
        return this.model
            .find(query)
            .sort({ createdAt: 1 }) // oldest first (FIFO)
            .populate("items.product", "name image")
            .populate("user", "name phone")
            .populate("cashier", "name username")
            .lean() as unknown as IOrder[];
    }
}
