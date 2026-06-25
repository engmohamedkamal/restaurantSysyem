export const EmailHTML = (otp: string) => {
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تأكيد البريد الإلكتروني</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #1a1a1a;
            background-image: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80');
            background-size: cover;
            background-position: center;
            padding: 60px 20px;
            text-align: center;
            color: #ffffff;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #c5a059;
        }
        .content {
            padding: 40px 30px;
            text-align: center;
            color: #333333;
            line-height: 1.6;
        }
        .content h2 {
            color: #1a1a1a;
            margin-bottom: 20px;
        }
        .otp-container {
            margin: 30px 0;
            padding: 20px;
            background-color: #f9f6f0;
            border: 2px dashed #c5a059;
            border-radius: 8px;
            display: inline-block;
        }
        .otp-code {
            font-size: 42px;
            font-weight: bold;
            color: #1a1a1a;
            letter-spacing: 10px;
            margin: 0;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 30px;
            text-align: center;
            font-size: 14px;
            color: #888888;
            border-top: 1px solid #eeeeee;
        }
        .social-links {
            margin-bottom: 20px;
        }
        .social-links a {
            margin: 0 10px;
            text-decoration: none;
            display: inline-block;
        }
        .social-links img {
            width: 24px;
            height: 24px;
            opacity: 0.7;
            transition: opacity 0.3s;
        }
        .social-links a:hover img {
            opacity: 1;
        }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            background-color: #c5a059;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 20px;
            transition: background-color 0.3s;
        }
        .btn:hover {
            background-color: #b08e4a;
        }
        .divider {
            height: 2px;
            background-color: #c5a059;
            width: 50px;
            margin: 20px auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RESTAURANT SYSTEM</h1>
            <p style="font-size: 18px; margin-top: 10px;">نكهة التميز في كل تفاصيلنا</p>
        </div>
        <div class="content">
            <h2>مرحباً بك في عائلتنا!</h2>
            <p>يسعدنا جداً انضمامك إلينا. لتفعيل حسابك والبدء في تجربة أشهى المأكولات، يرجى استخدام رمز التحقق التالي:</p>
            
            <div class="otp-container">
                <p style="margin-bottom: 10px; color: #c5a059; font-weight: bold;">رمز التحقق الخاص بك</p>
                <div class="otp-code">${otp}</div>
            </div>
            
            <p>هذا الرمز صالح لمدة 10 دقائق فقط. يرجى عدم مشاركته مع أي شخص.</p>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #666;">إذا لم تقم بإنشاء حساب في نظامنا، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
        </div>
        <div class="footer">
            <div class="social-links">
                <a href="${process.env.facebookLink || '#'}"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook"></a>
                <a href="${process.env.instegram || '#'}"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram"></a>
                <a href="${process.env.twitterLink || '#'}"><img src="https://cdn-icons-png.flaticon.com/512/3256/3256013.png" alt="Twitter"></a>
            </div>
            <p>&copy; 2024 نظام المطاعم الاحترافي. جميع الحقوق محفوظة.</p>
            <p>القاهرة، مصر | هاتف: 01012345678</p>
        </div>
    </div>
</body>
</html>`;
}