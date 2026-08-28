import jwt from 'jsonwebtoken';

export const requireAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'অনুমোদন মেলেনি। অনুগ্রহ করে অ্যাডমিন হিসেবে লগইন করুন।',
        messageEn: 'Unauthorized. Admin token missing.',
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is required.');
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'অবৈধ বা মেয়াদোত্তীর্ণ সেশন। পুনরায় লগইন করুন।',
      messageEn: 'Invalid or expired session. Please log in again.',
    });
  }
};
