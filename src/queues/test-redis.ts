// import { emailQueue } from "./email.queues";
import redis from "../utils/redis";


// async function test() {
//   const testEmail = "test@gmail.com";
//   const testOtp = "123456";

//   try {
//     // 1. تجربة تخزين الـ OTP في Redis مباشرة
//     await redis.set(`otp-${testEmail}`, testOtp, "EX", 60);
//     console.log("✅ OTP stored in Redis successfully");

//     // 2. محاولة قراءة الـ OTP عشان نتأكد إنه موجود
//     const savedOtp = await redis.get(`otp-${testEmail}`);
//     console.log("🔍 Retrieved OTP from Redis:", savedOtp);

//     // 3. التأكد من الـ TTL (الوقت المتبقي)
//     const ttl = await redis.ttl(`otp-${testEmail}`);
//     console.log(`⏱️ Time remaining for OTP: ${ttl} seconds`);

//     // 4. إضافة المهمة للـ BullMQ
//     await emailQueue.add("send-otp", {
//       email: testEmail,
//       otp: testOtp,
//     });
//     console.log("🚀 Job added to BullMQ successfully");

//     process.exit(0);
//   } catch (err: any) {
//     console.error("❌ Test failed:", err.message);
//     process.exit(1);
//   }
// }

// test();


async function test() {
  await redis.set("test", "hello redis", "EX", 60);

  console.log("saved");
}

test();