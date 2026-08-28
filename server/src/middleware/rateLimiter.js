import rateLimit from 'express-rate-limit';

// Global API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'অতিরিক্ত অনুরোধ এসেছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
    messageEn: 'Too many requests. Please try again later.'
  }
});

// Strict rate limit for reporting endpoints
export const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 reports per IP in 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'অল্প সময়ে খুব বেশি রিপোর্ট করা হয়েছে। অনুগ্রহ করে ১০-১৫ মিনিট অপেক্ষা করুন।',
    messageEn: 'Too many reports from this network. Please wait a few minutes before reporting again.'
  }
});

// Admin login rate limit
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'লগইন চেষ্টার সীমা অতিক্রম করেছে। ১৫ মিনিট পর চেষ্টা করুন।',
    messageEn: 'Too many login attempts. Please try again in 15 minutes.'
  }
});
