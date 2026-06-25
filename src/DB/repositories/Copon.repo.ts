import { Model } from "mongoose";
import { ICoupon } from "../model/Copon.model";
import { DBRepo } from "./DB.repo";


export class CoponRepo extends DBRepo<ICoupon> {
    constructor(protected readonly model: Model<ICoupon>) {
        super(model);
    }
} 