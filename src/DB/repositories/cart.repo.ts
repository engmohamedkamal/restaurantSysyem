import { HydratedDocument, Model, ProjectionType, QueryFilter, UpdateWriteOpResult } from "mongoose";
import { ICart } from "../model/cart.model";
import { DBRepo } from "./DB.repo";

export class CartRepo extends DBRepo<ICart> {
    constructor(protected readonly model: Model<ICart>) {
        super(model);
    }

    async findUserCart(userId: string): Promise<HydratedDocument<ICart> | null> {
        return this.model.findOne({ user: userId }).populate("items.product", "name price image isAvailable");
    }

    async clearCart(userId: string): Promise<UpdateWriteOpResult> {
        return this.model.updateOne({ user: userId }, { items: [], subTotal: 0, totalPrice: 25 }); // Assuming 25 is default delivery fee
    }
}
