# دليل اختبار ميزة الإضافات والخيارات باستخدام Postman

يوضح هذا الملف السيناريوهات الكاملة لاختبار الميزة الجديدة باستخدام برنامج Postman خطوة بخطوة، بداية من إنشاء مجموعات الإضافات وحتى إتمام الطلب.

> [!NOTE]
> تأكد من وضع توكن المصادقة (`Bearer Token`) الخاص بـ **المدير (Manager)** في طلبات القسم الأول والثاني، وتوكن **المستخدم (User/Customer)** في طلبات القسم الثالث والرابع.

---

## 🛠️ القسم الأول: إنشاء مجموعات الإضافات (مدير - Manager)

### 1. إنشاء مجموعة إضافات اختيارية (مثال: إضافات البيتزا)
* **المسار (URL):** `POST http://localhost:3000/modifiers`
* **الرأس (Headers):** `Authorization: Bearer <MANAGER_TOKEN>`
* **جسم الطلب (Body - JSON):**
```json
{
  "name": "إضافات اختيارية",
  "minSelect": 0,
  "maxSelect": 3,
  "options": [
    { "name": "جبنة إضافية", "price": 15, "isAvailable": true },
    { "name": "مشروم", "price": 10, "isAvailable": true },
    { "name": "زيتون", "price": 5, "isAvailable": true },
    { "name": "فلفل هالبينو", "price": 8, "isAvailable": false }
  ]
}
```
*(احفظ الـ `_id` الخاص بهذه المجموعة من الاستجابة، لنفترض أنه: `MOD_TOPPINGS_ID`)*

### 2. إنشاء مجموعة إضافات إلزامية (مثال: الحجم)
* **المسار (URL):** `POST http://localhost:3000/modifiers`
* **الرأس (Headers):** `Authorization: Bearer <MANAGER_TOKEN>`
* **جسم الطلب (Body - JSON):**
```json
{
  "name": "اختر الحجم",
  "minSelect": 1,
  "maxSelect": 1,
  "options": [
    { "name": "صغير", "price": 0, "isAvailable": true },
    { "name": "وسط", "price": 30, "isAvailable": true },
    { "name": "كبير", "price": 60, "isAvailable": true }
  ]
}
```
*(احفظ الـ `_id` الخاص بهذه المجموعة من الاستجابة، لنفترض أنه: `MOD_SIZE_ID`)*

---

## 🍕 القسم الثاني: ربط مجموعات الإضافات بالمنتج (مدير - Manager)

عند إنشاء منتج جديد أو تحديث منتج موجود (مثال: بيتزا مارجريتا بسعر أساسي 100 ج.م):
* **المسار (URL):** `PUT http://localhost:3000/products/<PRODUCT_ID>` (أو `POST /products` للإنشاء)
* **الرأس (Headers):** `Authorization: Bearer <MANAGER_TOKEN>`
* **نوع الطلب:** `form-data` (لأن المنتج يحتوي على صورة)
* **الحقول (Key-Value):**
  * `modifiers`: `["MOD_SIZE_ID", "MOD_TOPPINGS_ID"]` (أرسلها كمصفوفة نصوص)
  * وأكمل باقي بيانات المنتج المعتادة (الصورة، الاسم، السعر، إلخ).

---

## 🛒 القسم الثالث: اختبار السلة وتخصيص الطلب (عميل - User)

> [!IMPORTANT]
> تأكد من استخدام توكن العميل `Authorization: Bearer <USER_TOKEN>` في هذا القسم.

### 🟢 السيناريو 1: إضافة منتج مع خيارات صحيحة ومتاحة
نضيف البيتزا بحجم وسط (+30 ج.م) وجبنة إضافية (+15 ج.م):
* **المسار (URL):** `POST http://localhost:3000/cart`
* **جسم الطلب (Body - JSON):**
```json
{
  "productId": "<PRODUCT_ID>",
  "quantity": 1,
  "selectedOptions": [
    {
      "modifierGroupId": "<MOD_SIZE_ID>",
      "optionName": "وسط"
    },
    {
      "modifierGroupId": "<MOD_TOPPINGS_ID>",
      "optionName": "جبنة إضافية"
    }
  ]
}
```
* **النتيجة المتوقعة:** يضاف المنتج بنجاح، ويكون سعر القطعة في الاستجابة `145` (100 السعر الأساسي + 30 الحجم + 15 الجبن).

---

### 🔴 السيناريو 2: فشل التحقق بسبب عدم اختيار خيار إلزامي
محاولة إضافة البيتزا دون اختيار الحجم (علماً بأن الحجم إلزامي `minSelect: 1`):
* **المسار (URL):** `POST http://localhost:3000/cart`
* **جسم الطلب (Body - JSON):**
```json
{
  "productId": "<PRODUCT_ID>",
  "quantity": 1,
  "selectedOptions": [
    {
      "modifierGroupId": "<MOD_TOPPINGS_ID>",
      "optionName": "مشروم"
    }
  ]
}
```
* **النتيجة المتوقعة:** يفشل الطلب برمز خطأ `400` مع رسالة: `"اختر الحجم" requires at least 1 selection(s)`.

---

### 🔴 السيناريو 3: فشل التحقق بسبب تخطي الحد الأقصى للاختيارات
محاولة اختيار حجمين مختلفين معاً (علماً بأن الحجم أقصى اختيار له هو `maxSelect: 1`):
* **المسار (URL):** `POST http://localhost:3000/cart`
* **جسم الطلب (Body - JSON):**
```json
{
  "productId": "<PRODUCT_ID>",
  "quantity": 1,
  "selectedOptions": [
    {
      "modifierGroupId": "<MOD_SIZE_ID>",
      "optionName": "صغير"
    },
    {
      "modifierGroupId": "<MOD_SIZE_ID>",
      "optionName": "كبير"
    }
  ]
}
```
* **النتيجة المتوقعة:** يفشل الطلب برمز خطأ `400` مع رسالة تفيد بتخطي الحد الأقصى للمجموعة.

---

### 🔴 السيناريو 4: محاولة اختيار خيار غير متوفر حالياً
محاولة اختيار "فلفل هالبينو" (الذي قمنا بتعطيله `isAvailable: false`):
* **المسار (URL):** `POST http://localhost:3000/cart`
* **جسم الطلب (Body - JSON):**
```json
{
  "productId": "<PRODUCT_ID>",
  "quantity": 1,
  "selectedOptions": [
    {
      "modifierGroupId": "<MOD_SIZE_ID>",
      "optionName": "كبير"
    },
    {
      "modifierGroupId": "<MOD_TOPPINGS_ID>",
      "optionName": "فلفل هالبينو"
    }
  ]
}
```
* **النتيجة المتوقعة:** يفشل الطلب برمز خطأ `400` مع رسالة: `Option "فلفل هالبينو" is not available in "إضافات اختيارية"`.

---

### 🟢 السيناريو 5: إضافة نفس المنتج بمواصفات مختلفة
نضيف نفس البيتزا مجدداً ولكن بحجم كبير (+60 ج.م) وبدون إضافات اختيارية:
* **المسار (URL):** `POST http://localhost:3000/cart`
* **جسم الطلب (Body - JSON):**
```json
{
  "productId": "<PRODUCT_ID>",
  "quantity": 1,
  "selectedOptions": [
    {
      "modifierGroupId": "<MOD_SIZE_ID>",
      "optionName": "كبير"
    }
  ]
}
```
* **النتيجة المتوقعة:** يتم إضافتها كعنصر مستقل تماماً في السلة ويظهر لديك عنصرين بيتزا في مصفوفة `items` (الأول وسط بالجبنة بسعر 145، والثاني كبير بسعر 160).

---

## 🧾 القسم الرابع: إتمام الطلب وتجميد الأسعار (Checkout)

بعد استقرار السلة، قم بطلب الـ Checkout لإنشاء طلب:
* **المسار (URL):** `POST http://localhost:3000/orders`
* **جسم الطلب (Body - JSON):**
```json
{
  "orderType": "delivery",
  "phone": "01012345678",
  "shippingAddress": "القاهرة، المعادي"
}
```
* **النتيجة المتوقعة:** يتم إنشاء طلب بنجاح، وستجد داخل مصفوفة المنتجات الخاصة بالأوردر حقل الـ `selectedOptions` منسوخاً بالكامل ومثبتاً بالأسعار المحددة وقت الشراء.

---

## 🤖 القسم الخامس: المسح والاستيراد بالذكاء الاصطناعي (AI Menu Scanner)

يستخدم هذا القسم نموذج **Gemini 1.5 Flash** لمسح المنيو (صور أو ملف PDF) وإدراجه مباشرةً بقاعدة البيانات.

* **المسار (URL):** `POST http://localhost:3000/menu-scanner/scan-and-import`
* **الرأس (Headers):** 
  * `Authorization: Bearer <MANAGER_TOKEN>`
* **نوع الطلب:** `form-data`
* **الحقول (Key-Value):**
  * `menu_files`: (قم برفع ملف PDF أو حتى 5 صور للمنيو، نوع الحقل File)
* **النتيجة المتوقعة:** 
  * يقوم النظام بقراءة الملفات تلقائياً عبر Gemini.
  * يستخرج الأقسام (Categories) والمنتجات (Products).
  * ينشئ الأقسام والمنتجات التي لا توجد مسبقاً بقاعدة البيانات تلقائياً، ويربطها بالمدير ويرفع لها صورة افتراضية (Placeholder).
  * يعود بـ JSON يحتوي على ملخص العملية والـ IDs الجديدة التي تم إنشاؤها لكي تتمكن من تعديلها أو حذفها لاحقاً عبر لوحة التحكم.

