# ⚡ কারেন্ট আছে? — Bangladesh Electricity Status (CurrentAche BD)

> **উন্মুক্ত ও রিয়েল-টাইম ক্রাউড-সোর্সড বিদ্যুৎ ও লোডশেডিং ট্র্যাকার প্ল্যাটফর্ম**  
> A production-ready, mobile-first full-stack crowd-sourced electricity status platform for Bangladesh.

---

## 🌟 মূল বৈশিষ্ট্যসমূহ (Core Features)

1. **সম্পূর্ণ প্রশাসনিক কভারেজ (Complete Administrative Hierarchy & Search)**:
   - **৮টি বিভাগ** $\rightarrow$ **৬৪টি জেলা** $\rightarrow$ **৫৯৩টি উপজেলা ও থানা**।
   - বাংলা এবং ইংরেজি উভয় ভাষায় তাৎক্ষণিক অটো-কমপ্লিট সার্চ।
   - ধাপে ধাপে ড্রপডাউন নির্বাচন (বিভাগ $\rightarrow$ জেলা $\rightarrow$ উপজেলা) এবং নির্দিষ্ট মহল্লা ইনপুট।
2. **১-ট্যাপে দ্রুত ও নিরাপদ রিপোর্টিং (Frictionless 1-Tap Reporting)**:
   - কোনো অ্যাকাউন্ট বা জটিল সাইনআপ ছাড়াই সাধারণ জনগণ তাৎক্ষণিকভাবে 🟢 **কারেন্ট আছে** অথবা 🔴 **কারেন্ট নেই** জানাতে পারেন।
3. **শতভাগ আসল তথ্য (No Fake / Demo Reports in Database)**:
   - কোনো প্রকার কৃত্রিম বা ডেমো রিপোর্ট ডাটাবেজে রাখা হয় না। রিপোর্ট না থাকা এলাকাগুলোতে সততার সাথে **"পর্যাপ্ত তথ্য নেই"** প্রদর্শিত হয়।
4. **স্মার্ট কনসেনসাস ও সময়-ভিত্তিক অ্যালগরিদম (Smart Consensus & Decay Algorithm)**:
   - গত ৬০ মিনিটের রিপোর্টকে সর্বোচ্চ গুরুত্ব দেওয়া হয় (Time Decay)।
   - গণনায় শতকরা হার (Percentage Consensus) এবং নির্ভরযোগ্যতার মাত্রা (High / Medium / Low Confidence) প্রদর্শন।
   - ফ্রেশনেস ইন্ডিকেটর ও লাইভ কাউন্টডাউন ("২ মিনিট আগে")।
5. **স্প্যাম ও ভুয়া রিপোর্ট প্রতিরোধ (Anti-Spam & Privacy-First)**:
   - কোনো ব্যবহারকারীর ব্যক্তিগত নাম বা র' (Raw) আইপি সংরক্ষণ করা হয় না।
   - সল্টেড HMAC-SHA-256 ক্রিপ্টোগ্রাফিক আইপি হ্যাশিং।
   - প্রতি এলাকা ও ক্লায়েন্টে ১০ মিনিটের কুল-ডাউন (Cooldown) প্রটেকশন।
   - এক্সপ্রেস রেট লিমিটিং (`express-rate-limit`) ও হেলমেট সিকিউরিটি।
6. **সারাদেশের ডিরেক্টরি ও পরিসংখ্যান (Nationwide Directory & Statistics)**:
   - ৮টি বিভাগের সকল জেলার উপজেলাভিত্তিক স্ট্যাটাস ডিরেক্টরি (`/areas`)।
   - আজকের মোট রিপোর্ট, সচল এলাকা ও লোডশেডিং এলাকা বিশ্লেষণের ড্যাশবোর্ড (`/stats`)।
   - লাইভ কমিউনিটি রিপোর্ট স্ট্রিম।
7. **সুরক্ষিত অ্যাডমিন প্যানেল (Protected Admin Dashboard)**:
   - JWT টোকেন ভিত্তিক সুরক্ষিত অ্যাডমিন প্রবেশদ্বার (`/admin`)।
   - কোনো হার্ডকোডেড ডিফল্ট পাসওয়ার্ড নেই; পরিবেশ ভেরিয়েবল দ্বারা বাধ্যতামূলক সুরক্ষিত।
   - লাইভ রিপোর্ট অডিট, আইপি হ্যাশ ট্র্যাকিং এবং ভুয়া রিপোর্ট মুছে ফেলা বা ফ্ল্যাগ করার সুবিধা।

---

## 🛠 প্রযুক্তি ও আর্কিটেকচার (Technology Stack)

### Frontend (`/client`)
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS, Mobile-First Responsive Design, Bengali Typography (`Hind Siliguri`)
- **Routing**: React Router v6 (SPA routing configured with `vercel.json` rewrites)
- **Deployment**: Vercel Frontend

### Backend (`/server`)
- **Runtime**: Node.js & Express.js (ES Modules)
- **Architecture**: Vercel Serverless Function (`api/index.js`) + Serverless-safe connection caching
- **Database**: MongoDB Atlas via Mongoose
- **Security**: Helmet, CORS, Express-Rate-Limit, Crypto (HMAC-SHA-256)
- **Authentication**: JWT & BcryptJS

---

## 📁 ফোল্ডার স্ট্রাকচার (Project Structure)

```
Electricity status BD/
├── client/                     # React + Vite Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/         # Navbar, Footer, SearchBar, LocationHierarchySelector, StatusBadge, ReportCard, etc.
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── pages/              # Home, AreaStatus, AreasExplorer, Stats, About, Admin, AdminLogin, NotFound
│   │   ├── services/           # api.js (Centralized Axios instance with VITE_API_URL)
│   │   ├── utils/              # timeAgo.js, banglaDigits.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── vercel.json             # Vercel SPA rewrites
├── server/                     # Express REST API Backend
│   ├── api/
│   │   └── index.js            # Vercel Serverless Entrypoint
│   ├── src/
│   │   ├── config/             # MongoDB connection with serverless caching (db.js)
│   │   ├── controllers/        # locationController, reportController, statsController, adminController
│   │   ├── middleware/         # errorHandler, rateLimiter, authMiddleware
│   │   ├── models/             # Location.js, ElectricityReport.js, AdminUser.js
│   │   ├── routes/             # locationRoutes, reportRoutes, statsRoutes, adminRoutes
│   │   ├── seeds/              # seed.js (Complete dataset: 8 Divisions, 64 Districts, 593 Upazilas)
│   │   ├── services/           # statusCalculator.js, spamProtection.js
│   │   ├── utils/              # hashIp.js, banglaNumbers.js
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   └── vercel.json             # Vercel Serverless Function routes
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 লোকাল সেটআপ নির্দেশিকা (Local Development Setup)

### ১. রিপোজিটরি প্রস্তুতকরণ
```bash
# ব্যাকএন্ড প্যাকেজ ইনস্টল
cd server
npm install

# .env তৈরি করুন (server/.env.example অনুসারে)
```

`server/.env` উদাহরণ:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/electricity_status_bd
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_dev_jwt_secret_key_here
IP_SALT=your_dev_ip_salt_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongDevPassword123!
```

### ২. ডাটাবেজ সীড (Seed Complete Bangladesh Administrative Hierarchy)
```bash
npm run seed
```
আউটপুট:
```
===================================================
⚡ Bangladesh Electricity Status (CurrentAche BD) Seed
===================================================
[Seed] Connecting to MongoDB...
[Seed] ✅ MongoDB connected successfully.
[Seed] Seeding 593 official Upazilas/Thanas across 64 Districts and 8 Divisions...
[Seed] ✅ Location data seed complete.
[Seed] ✅ Admin user configured.
[Seed] 📊 Real Electricity Reports in Database: 0 (Zero fake demo reports generated)
===================================================
🎉 SEED VERIFICATION SUMMARY:
   • Total Divisions: 8 (All official divisions)
   • Total Districts: 64 (All 64 official districts)
   • Total Upazilas/Thanas: 593 (Complete administrative coverage)
   • Demo Electricity Reports: 0 (Fresh real-data state)
===================================================
```

### ৩. ব্যাকএন্ড ও ফ্রন্টএন্ড চালুকরণ
```bash
# ব্যাকএন্ড রান (http://localhost:5000)
npm start

# ফ্রন্টএন্ড রান (নতুন টার্মিনালে)
cd ../client
npm install
npm run dev
# ব্রাউজারে খুলুন: http://localhost:5173
```

---

## ☁️ VERCEL + MONGODB ATLAS ডিপ্লয়মেন্ট গাইড (Vercel Deployment)

এই পুরো প্রজেক্টটি Vercel (Frontend & Serverless Backend) এবং MongoDB Atlas ক্লাউড ডাটাবেজে ডিপ্লয় করার জন্য প্রস্তুত।

### ধাপ ১: MongoDB Atlas ডাটাবেজ তৈরি
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)-এ লগইন করে একটি ফ্রি ক্লাস্টার (M0) তৈরি করুন।
2. **Database Access**: একটি ডাটাবেজ ইউজারনেম এবং শক্তিশালী পাসওয়ার্ড তৈরি করুন।
3. **Network Access**: `0.0.0.0/0` (Allow access from anywhere) যুক্ত করুন।
4. Connection String কপি করুন (যেমন: `mongodb+srv://user:pass@cluster.mongodb.net/electricity_status_bd?retryWrites=true&w=majority`).

### ধাপ ২: Backend $\rightarrow$ Vercel Serverless Deployment
1. Vercel ড্যাশবোর্ডে **Add New Project** ক্লিক করুন।
2. রিপোজিটরি নির্বাচন করে **Root Directory** হিসেবে `server` নির্বাচন করুন।
3. **Environment Variables**-এ যোগ করুন:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: আপনার MongoDB Atlas কানেকশন স্ট্রিং
   - `CLIENT_URL`: আপনার ফ্রন্টএন্ড Vercel URL
   - `JWT_SECRET`: একটি শক্তিশালী র‍্যান্ডম সিক্রেট স্ট্রিং
   - `IP_SALT`: একটি শক্তিশালী র‍্যান্ডম আইপি হ্যাশিং সল্ট
   - `ADMIN_USERNAME`: আপনার পছন্দের অ্যাডমিন ইউজারনেম
   - `ADMIN_PASSWORD`: আপনার পছন্দের অ্যাডমিন পাসওয়ার্ড
4. **Deploy** ক্লিক করুন।
5. ডিপ্লয়মেন্ট শেষে টেস্ট করুন: `https://YOUR-BACKEND.vercel.app/api/health`

### ধাপ ৩: Frontend $\rightarrow$ Vercel Deployment
1. Vercel ড্যাশবোর্ডে **Add New Project** ক্লিক করুন।
2. একই রিপোজিটরি নির্বাচন করে **Root Directory** হিসেবে `client` নির্বাচন করুন।
3. **Framework Preset**: `Vite` (অটো ডিটেক্ট হবে)।
4. **Environment Variables**-এ যোগ করুন:
   - `VITE_API_URL`: `https://YOUR-BACKEND.vercel.app/api` (ধাপ ২ এ প্রাপ্ত ব্যাকএন্ড ডোমেইন)
5. **Deploy** ক্লিক করুন।
6. আপনার ফ্রন্টএন্ড লাইভ হয়ে যাবে এবং সকল রাউট (`/`, `/areas`, `/stats`, `/about`, `/area/:id`, `/admin`) পেজ রিফ্রেশেও নিরবচ্ছিন্নভাবে কাজ করবে!

---

## ⚖️ স্বচ্ছতা ও অস্বীকৃতি (Disclaimer)

> **⚠️ পাবলিক সার্ভিস নোটিউট:**  
> এই প্ল্যাটফর্মটি সম্পূর্ণভাবে সাধারণ নাগরিকদের দেওয়া তাৎক্ষণিক কমিউনিটি তথ্যের ভিত্তিতে পরিচালিত। এটি কোনো বিদ্যুৎ বিতরণ সংস্থা বা সরকারি কর্তৃপক্ষের দাপ্তরিক ঘোষণা নয়।

---

## 📄 লাইসেন্স (License)

MIT License &copy; 2026 কারেন্ট আছে? (CurrentAche BD)