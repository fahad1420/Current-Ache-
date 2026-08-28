export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `অনুরোধকৃত পথ '${req.originalUrl}' পাওয়া যায়নি।`,
    messageEn: `Requested endpoint '${req.originalUrl}' was not found.`,
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error('[Unhandled Error]:', err);

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'অবৈধ আইডি ফরম্যাট প্রদান করা হয়েছে।',
      messageEn: `Invalid ID format for ${err.path}`,
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'তথ্য যাচাইকরণ ব্যর্থ হয়েছে: ' + messages.join(', '),
      messageEn: 'Validation error: ' + messages.join(', '),
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    messageEn: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
