import { Request, Response, NextFunction } from "express";
import cartModel from "../../DB/model/cart.model";
import productModel from "../../DB/model/product.model";
import modifierGroupModel from "../../DB/model/modifierGroup.model";
import { CartRepo } from "../../DB/repositories/cart.repo";
import { ProductRepo } from "../../DB/repositories/product.repo";
import { ModifierGroupRepo } from "../../DB/repositories/modifierGroup.repo";
import { AppError } from "../../utils/AppError";
import { AddToCartInput, UpdateCartInput } from "./cart.validation";

class CartService {
    private _cartRepo = new CartRepo(cartModel);
    private _productRepo = new ProductRepo(productModel);
    private _modifierGroupRepo = new ModifierGroupRepo(modifierGroupModel);
    private deliveryFee = 25;

    constructor() { }

    private calcTotals(cart: any) {
        let subTotal = 0;
        for (const item of cart.items) {
            subTotal += item.price * item.quantity;
        }
        cart.subTotal = subTotal;
        cart.deliveryFee = cart.items.length > 0 ? this.deliveryFee : 0;
        cart.totalPrice = cart.subTotal + cart.deliveryFee;
        return cart;
    }

    /**
     * Validate selectedOptions against the product's modifier groups.
     * Returns resolved options with groupName, optionName, price, and modifierGroupId.
     */
    private async validateAndResolveOptions(
        productId: string,
        selectedOptions?: { modifierGroupId: string; optionName: string }[]
    ) {
        const product = await this._productRepo.findById(productId);
        if (!product) throw new AppError("Product not found", 404);

        const resolvedOptions: {
            modifierGroupId: any;
            groupName: string;
            optionName: string;
            price: number;
        }[] = [];

        // If product has no modifiers, skip validation
        if (!product.modifiers || product.modifiers.length === 0) {
            if (selectedOptions && selectedOptions.length > 0) {
                throw new AppError("This product does not have any modifier options", 400);
            }
            return { resolvedOptions, optionsTotal: 0 };
        }

        // Fetch all modifier groups for this product
        const modifierGroups = await Promise.all(
            product.modifiers.map(modId => this._modifierGroupRepo.findById(modId as any))
        );
        const validGroups = modifierGroups.filter(g => g !== null);

        // Build a map: modifierGroupId -> ModifierGroup doc
        const groupMap = new Map(validGroups.map(g => [g!._id.toString(), g!]));

        // Check required groups (minSelect > 0)
        for (const group of validGroups) {
            if (group!.minSelect > 0) {
                const selectionsForGroup = (selectedOptions || []).filter(
                    opt => opt.modifierGroupId === group!._id.toString()
                );
                if (selectionsForGroup.length < group!.minSelect) {
                    throw new AppError(
                        `"${group!.name}" requires at least ${group!.minSelect} selection(s)`,
                        400
                    );
                }
            }
        }

        // Validate each selected option
        if (selectedOptions && selectedOptions.length > 0) {
            for (const sel of selectedOptions) {
                const group = groupMap.get(sel.modifierGroupId);
                if (!group) {
                    throw new AppError(
                        `Modifier group ${sel.modifierGroupId} is not available for this product`,
                        400
                    );
                }

                const option = group.options.find(
                    o => o.name === sel.optionName && o.isAvailable
                );
                if (!option) {
                    throw new AppError(
                        `Option "${sel.optionName}" is not available in "${group.name}"`,
                        400
                    );
                }

                resolvedOptions.push({
                    modifierGroupId: group._id,
                    groupName: group.name,
                    optionName: option.name,
                    price: option.price,
                });
            }

            // Validate maxSelect per group
            const groupCounts = new Map<string, number>();
            for (const opt of resolvedOptions) {
                const gId = opt.modifierGroupId.toString();
                groupCounts.set(gId, (groupCounts.get(gId) || 0) + 1);
            }
            for (const [gId, count] of groupCounts.entries()) {
                const group = groupMap.get(gId);
                if (group && count > group.maxSelect) {
                    throw new AppError(
                        `"${group.name}" allows at most ${group.maxSelect} selection(s), but ${count} were provided`,
                        400
                    );
                }
            }
        }

        const optionsTotal = resolvedOptions.reduce((sum, o) => sum + o.price, 0);
        return { resolvedOptions, optionsTotal };
    }

    /**
     * Check if two sets of selectedOptions are identical (same modifiers chosen).
     * Used to decide whether to merge items or add as a new line.
     */
    private optionsMatch(
        a: { modifierGroupId: any; optionName: string }[],
        b: { modifierGroupId: any; optionName: string }[]
    ): boolean {
        if (a.length !== b.length) return false;
        const sortKey = (o: any) => `${o.modifierGroupId.toString()}_${o.optionName}`;
        const sortedA = [...a].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
        const sortedB = [...b].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
        return sortedA.every((opt, i) => sortKey(opt) === sortKey(sortedB[i]));
    }

    getCart = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!._id;

        let cart = await this._cartRepo.findUserCart(userId as any);
        if (!cart) {
            cart = await this._cartRepo.create({
                user: userId as any,
                items: [],
                deliveryFee: 0,
                subTotal: 0,
                totalPrice: 0
            });
        }

        const calculatedCart = this.calcTotals(cart.toObject());

        return res.status(200).json({ message: "success", cart: calculatedCart });
    };

    addToCart = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!._id;
        const { productId, quantity, selectedOptions }: AddToCartInput = req.body;

        const product = await this._productRepo.findById(productId);
        if (!product || !product.isAvailable) {
            throw new AppError("Product not found or not available", 404);
        }

        // Check if product is an expired offer
        if (product.isOffer && product.offerEndDate && new Date(product.offerEndDate) <= new Date()) {
            throw new AppError("This offer has expired and can no longer be added to cart", 400);
        }

        // Validate and resolve modifier options
        const { resolvedOptions, optionsTotal } = await this.validateAndResolveOptions(
            productId,
            selectedOptions
        );

        const itemPrice = product.price + optionsTotal;

        let cart = await this._cartRepo.findOne({ user: userId } as any);
        if (!cart) {
            cart = await this._cartRepo.create({ user: userId as any, items: [] });
        }

        // Find matching item: same product AND same selectedOptions
        const itemIndex = cart.items.findIndex(item => {
            if (item.product.toString() !== productId) return false;
            return this.optionsMatch(
                (item as any).selectedOptions || [],
                resolvedOptions
            );
        });

        if (itemIndex > -1) {
            const currentItem = cart.items[itemIndex];
            if (currentItem) {
                currentItem.quantity += quantity;
                currentItem.price = itemPrice;
            }
        } else {
            cart.items.push({
                product: product._id,
                quantity,
                price: itemPrice,
                selectedOptions: resolvedOptions,
            });
        }

        this.calcTotals(cart);
        await cart.save();

        const populatedCart = await this._cartRepo.findUserCart(userId as any);

        return res.status(200).json({ message: "Item added to cart", cart: populatedCart });
    };

    updateItemQuantity = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!._id;
        const productId = req.params.productId;
        const { quantity }: UpdateCartInput = req.body;

        const cart = await this._cartRepo.findOne({ user: userId } as any);
        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex === -1) {
            throw new AppError("Item not found in cart", 404);
        }

        const currentItem = cart.items[itemIndex];
        if (currentItem) {
            currentItem.quantity = quantity;
        }

        this.calcTotals(cart);
        await cart.save();

        const populatedCart = await this._cartRepo.findUserCart(userId as any);

        return res.status(200).json({ message: "Cart updated", cart: populatedCart });
    };

    removeItem = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!._id;
        const productId = req.params.productId;

        const cart = await this._cartRepo.findOne({ user: userId } as any);
        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        cart.items = cart.items.filter(item => item.product.toString() !== productId);

        this.calcTotals(cart);
        await cart.save();

        const populatedCart = await this._cartRepo.findUserCart(userId as any);

        return res.status(200).json({ message: "Item removed from cart", cart: populatedCart });
    };

    clearCart = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user!._id;

        const cart = await this._cartRepo.findOne({ user: userId } as any);
        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        cart.items = [];
        this.calcTotals(cart);
        await cart.save();

        return res.status(200).json({ message: "Cart cleared", cart });
    };
}

export default new CartService();
