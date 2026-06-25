import { Request, Response, NextFunction } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import categoryModel from "../../DB/model/category.model";
import productModel from "../../DB/model/product.model";
import { AppError } from "../../utils/AppError";
import mongoose from "mongoose"; // استيراد مونجوس عشان الـ Transaction

class MenuScannerService {
    // تم تحويلها لـ readonly ومباشرة لتجنب مشاكل الـ "this" scope
    private readonly defaultImage = {
        secure_url: "https://res.cloudinary.com/dcmjq0hjo/image/upload/v1717366367/restaurant/placeholders/placeholder.png",
        public_id: "restaurant/placeholders/placeholder"
    };

    constructor() {
        // خطوة أمان لضمان أن الـ this دايماً تشير للكلاس الحالي
        this.scanAndImportMenu = this.scanAndImportMenu.bind(this);
    }

    scanAndImportMenu = async (req: Request, res: Response, next: NextFunction) => {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
            throw new AppError("Gemini API key is not configured in the environment variables", 500);
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            throw new AppError("Please upload at least one menu file (Image or PDF)", 400);
        }

        const userId = req.user!._id;

        // بدء الـ Transaction لحماية الداتابيز
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. تحويل الملفات لـ base64 لـ Gemini
            const fileParts = files.map(file => ({
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype
                },
            }));

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            // 2. البرومبت الذكي بتاعك
            const prompt = `
            You are a professional menu data extractor. 
            Analyze the attached menu files (which could be images or a multi-page PDF document) and extract all categories and their items.
            
            Rules:
            1. Extract all categories (e.g., "Appetizers", "Main Courses", "Drinks", "الشوربات", "السلطات").
            2. For each category, extract all food/drink items under it.
            3. For each item, extract:
               - "name": The item's name.
               - "price": The price as a positive number. If there are multiple sizes/prices, extract the lowest price or default price as a simple number.
               - "description": The item description if present (e.g., ingredients, portion size). If none, write an empty string "".
            4. Merge categories with similar or identical names across different pages (do not duplicate categories).
            5. Keep the language of the category names, item names, and descriptions exactly as written in the menu images (either Arabic, English, or bilingual). Do not translate them.
            6. Ensure the response format complies with this JSON schema exactly:
            {
              "categories": [
                {
                  "category_name": "Category Name",
                  "items": [
                    {
                      "name": "Item Name",
                      "price": 50,
                      "description": "Item description"
                    }
                  ]
                }
              ]
            }
            `;

            const result = await model.generateContent([prompt, ...fileParts]);
            const responseText = result.response.text();

            if (!responseText) {
                throw new AppError("Failed to get response from Gemini AI", 500);
            }

            const menuData = JSON.parse(responseText.trim());

            if (!menuData.categories || !Array.isArray(menuData.categories)) {
                throw new AppError("Invalid data format returned from AI model", 500);
            }

            const results = [];

            // 3. معالجة البيانات وحفظها جوة الـ Transaction
            for (const cat of menuData.categories) {
                const categoryName = (cat.category_name || "").trim();
                if (!categoryName) continue;

                // البحث عن القسم أو إنشاؤه مع تمرير الـ session
                let categoryDoc = await categoryModel.findOne({
                    name: { $regex: new RegExp(`^${categoryName}$`, "i") },
                    isDeleted: false
                }).session(session);

                let isNewCategory = false;
                if (!categoryDoc) {
                    // مصفوفة لأن create في وجود session بتاخد مصفوفة عناصر
                    const [newCategory] = await categoryModel.create([{
                        name: categoryName,
                        image: this.defaultImage,
                        createdBy: userId as any,
                        isActive: true
                    }], { session });
                    
                    categoryDoc = newCategory || null;
                    isNewCategory = true;
                }

                if (!categoryDoc) continue;

                const categoryProducts = [];
                const itemsList = cat.items || [];
                
                for (const item of itemsList) {
                    const itemName = (item.name || "").trim();
                    if (!itemName) continue;

                    let productDoc = await productModel.findOne({
                        name: { $regex: new RegExp(`^${itemName}$`, "i") },
                        category: categoryDoc._id,
                        isDeleted: false
                    }).session(session);

                    let isNewProduct = false;
                    if (!productDoc) {
                        const itemPrice = typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
                        
                        const [newProduct] = await productModel.create([{
                            name: itemName,
                            description: item.description || "",
                            price: itemPrice,
                            category: categoryDoc._id,
                            image: this.defaultImage,
                            createdBy: userId as any,
                            isAvailable: true
                        }], { session });

                        productDoc = newProduct || null;
                        isNewProduct = true;
                    }

                    if (!productDoc) continue;

                    categoryProducts.push({
                        id: productDoc._id,
                        name: productDoc.name,
                        price: productDoc.price,
                        isNew: isNewProduct
                    });
                }

                results.push({
                    categoryId: categoryDoc._id,
                    categoryName: categoryDoc.name,
                    isNewCategory,
                    productsCount: categoryProducts.length,
                    products: categoryProducts
                });
            }

            // لو كل حاجة تمام.. ثبت التغييرات في الداتابيز فوراً
            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                message: "Menu scanned and imported successfully",
                totalPagesProcessed: files.length,
                summary: results
            });

        } catch (error: any) {
            // لو حصل أي خطأ في أي ثانية.. الغي كل اللي حصل وماتنزلش حاجة في الداتابيز
            await session.abortTransaction();
            session.endSession();

            console.error("Gemini Scan and Import Error:", error);
            
            // تمرير الخطأ لـ Global Error Handler بتاع Express
            return next(new AppError(error.message || "An error occurred during menu scanning & import", 500));
        }
    };
}

export default new MenuScannerService();