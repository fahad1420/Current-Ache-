// vite.config.js
import { defineConfig } from "file:///C:/projects/Electricity%20status%20BD/client/node_modules/vite/dist/node/index.js";
import react from "file:///C:/projects/Electricity%20status%20BD/client/node_modules/@vitejs/plugin-react/dist/index.js";

// api/_handler.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

// api/_db.js
import mongoose from "file:///C:/projects/Electricity%20status%20BD/client/node_modules/mongoose/index.js";
import dns from "dns";
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch (e) {
}
var MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://fahadhossain04_db_user:VdxUrHygIFzvjLob@cluster0.qnigurs.mongodb.net/electricity_status_bd?retryWrites=true&w=majority&appName=Cluster0";
var cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}
async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5e3,
      connectTimeoutMS: 5e3,
      family: 4
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    }).catch((err) => {
      console.warn("MongoDB Atlas connection notice:", err.message);
      cached.promise = null;
      return null;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
  }
  return cached.conn;
}
var LocationSchema = new mongoose.Schema(
  {
    nameBn: { type: String, required: true },
    nameEn: { type: String, required: true },
    division: { type: String, required: true },
    divisionBn: { type: String, required: true },
    district: { type: String, required: true },
    districtBn: { type: String, required: true },
    upazila: String,
    upazilaBn: String,
    slug: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    status: {
      type: String,
      enum: ["available", "unavailable", "insufficient_data", "mixed"],
      default: "insufficient_data",
      index: true
    },
    totalRecentReports: { type: Number, default: 0 },
    availablePercentage: { type: Number, default: 0 },
    unavailablePercentage: { type: Number, default: 0 },
    lastReportAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);
var ReportSchema = new mongoose.Schema(
  {
    locationId: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["available", "unavailable"],
      required: true,
      index: true
    },
    duration: { type: String, default: "just_now" },
    customMinutes: { type: Number, default: null },
    locality: { type: String, default: "" },
    clientFingerprint: { type: String, default: "" },
    source: { type: String, default: "web" },
    isFlagged: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
var LocationModel = mongoose.models.Location || mongoose.model("Location", LocationSchema, "locations");
var ReportModel = mongoose.models.ElectricityReport || mongoose.model("ElectricityReport", ReportSchema, "electricityreports");

// api/_handler.js
var defaultLocations = [];
try {
  const locationsPath = path.join(process.cwd(), "src", "data", "bangladeshLocations.json");
  if (fs.existsSync(locationsPath)) {
    defaultLocations = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
  } else {
    const altPath = path.join(process.cwd(), "client", "src", "data", "bangladeshLocations.json");
    if (fs.existsSync(altPath)) {
      defaultLocations = JSON.parse(fs.readFileSync(altPath, "utf8"));
    }
  }
} catch (e) {
  defaultLocations = [];
}
var fallbackReports = [
  {
    _id: "rep_init_1",
    locationId: { nameBn: "\u09AE\u09BF\u09B0\u09AA\u09C1\u09B0", nameEn: "Mirpur", districtBn: "\u09A2\u09BE\u0995\u09BE", district: "Dhaka", divisionBn: "\u09A2\u09BE\u0995\u09BE", division: "Dhaka" },
    status: "available",
    locality: "\u09B8\u09C7\u0995\u09CD\u099F\u09B0 \u09E7",
    createdAt: new Date(Date.now() - 15 * 6e4).toISOString()
  },
  {
    _id: "rep_init_2",
    locationId: { nameBn: "\u0989\u09A4\u09CD\u09A4\u09B0\u09BE", nameEn: "Uttara", districtBn: "\u09A2\u09BE\u0995\u09BE", district: "Dhaka", divisionBn: "\u09A2\u09BE\u0995\u09BE", division: "Dhaka" },
    status: "available",
    locality: "\u09B8\u09C7\u0995\u09CD\u099F\u09B0 \u09ED",
    createdAt: new Date(Date.now() - 45 * 6e4).toISOString()
  }
];
async function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (req.body && typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}
function generateToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1e3) + 7 * 86400 })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
async function handleApiRequest(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let pathname = url.pathname.replace(/^\/api/, "");
  if (!pathname || pathname === "") pathname = "/";
  const db = await connectToDatabase();
  try {
    if (pathname === "/health" || pathname === "/") {
      let dbCount = 0;
      if (db) {
        try {
          dbCount = await ReportModel.countDocuments();
        } catch (e) {
        }
      }
      return res.status(200).json({
        status: "ok",
        service: "Electricity Status BD API (\u0995\u09BE\u09B0\u09C7\u09A8\u09CD\u099F \u0986\u099B\u09C7?)",
        database: db ? "MongoDB Atlas Connected" : "Fallback Local Dataset",
        locationsCount: defaultLocations.length,
        reportsCount: dbCount || fallbackReports.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if ((pathname === "/admin/login" || pathname === "/auth/login" || pathname === "/admin" || pathname === "/auth") && req.method === "POST") {
      const body = await parseRequestBody(req);
      const { username, password } = body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "\u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u0995\u09BE\u09B0\u09C0\u09B0 \u09A8\u09BE\u09AE \u0993 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09CD\u09B0\u09A6\u09BE\u09A8 \u0995\u09B0\u09C1\u09A8\u0964",
          messageEn: "Username and password required."
        });
      }
      const envUser = process.env.ADMIN_USERNAME || "admin";
      const envPass = process.env.ADMIN_PASSWORD || "currentBD2026!";
      const jwtSecret = process.env.JWT_SECRET || "electricity-status-bd-super-secret-jwt-key-2026";
      if (username === envUser && password === envPass) {
        const token = generateToken({ username, role: "admin" }, jwtSecret);
        return res.status(200).json({
          success: true,
          message: "\u09B2\u0997\u0987\u09A8 \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964",
          token,
          admin: {
            username,
            role: "admin"
          }
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "\u09AD\u09C1\u09B2 \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0\u0995\u09BE\u09B0\u09C0\u09B0 \u09A8\u09BE\u09AE \u0985\u09A5\u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1\u0964",
          messageEn: "Invalid username or password."
        });
      }
    }
    if (pathname === "/admin/reports" && req.method === "GET") {
      let reports = [];
      if (db) {
        try {
          reports = await ReportModel.find().sort({ createdAt: -1 }).limit(100).lean();
        } catch (e) {
          reports = fallbackReports;
        }
      } else {
        reports = fallbackReports;
      }
      return res.status(200).json({
        success: true,
        total: reports.length,
        page: 1,
        pages: 1,
        data: reports
      });
    }
    if ((pathname === "/reports" || pathname.startsWith("/reports")) && req.method === "POST") {
      const body = await parseRequestBody(req);
      const {
        locationId,
        locationName,
        district,
        division,
        latitude,
        longitude,
        isGpsCustom,
        status,
        duration,
        locality,
        customMinutes
      } = body;
      if (!locationId && (!latitude || !longitude) && !locationName) {
        return res.status(400).json({
          success: false,
          message: "\u098F\u09B2\u09BE\u0995\u09BE \u09A8\u09BF\u09B0\u09CD\u09AC\u09BE\u099A\u09A8 \u0995\u09B0\u09BE \u09AC\u09BE\u09A7\u09CD\u09AF\u09A4\u09BE\u09AE\u09C2\u09B2\u0995\u0964",
          messageEn: "Location required."
        });
      }
      let matched = defaultLocations.find(
        (l) => l._id === locationId || l.slug === locationId || locationName && (l.nameBn === locationName || l.nameEn === locationName)
      );
      if (!matched && (isGpsCustom || latitude && longitude)) {
        matched = {
          _id: locationId || `gps_${Date.now()}`,
          nameBn: locationName || `\u09AE\u09CD\u09AF\u09BE\u09AA \u0985\u09AC\u09B8\u09CD\u09A5\u09BE\u09A8`,
          nameEn: locationName || `Map Location`,
          district: district || "\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6",
          districtBn: district || "\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6",
          division: division || "Dhaka",
          divisionBn: division || "\u09A2\u09BE\u0995\u09BE",
          latitude: Number(latitude) || 23.8103,
          longitude: Number(longitude) || 90.4125,
          status: status || "available",
          totalRecentReports: 1,
          availablePercentage: status === "available" ? 100 : 0,
          unavailablePercentage: status === "unavailable" ? 100 : 0,
          lastReportAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        defaultLocations.push(matched);
      } else if (matched) {
        matched.status = status || "available";
        matched.lastReportAt = (/* @__PURE__ */ new Date()).toISOString();
        matched.totalRecentReports = (matched.totalRecentReports || 0) + 1;
        if (status === "available") {
          matched.availablePercentage = 100;
          matched.unavailablePercentage = 0;
        } else {
          matched.availablePercentage = 0;
          matched.unavailablePercentage = 100;
        }
      }
      const reportPayload = {
        locationId: matched ? {
          _id: matched._id,
          nameBn: matched.nameBn,
          nameEn: matched.nameEn,
          districtBn: matched.districtBn,
          district: matched.district,
          divisionBn: matched.divisionBn,
          division: matched.division,
          slug: matched.slug
        } : { nameBn: locationName || "\u098F\u09B2\u09BE\u0995\u09BE", nameEn: "Area", districtBn: "\u09A2\u09BE\u0995\u09BE", district: "Dhaka" },
        status: status || "available",
        duration: duration || "just_now",
        customMinutes: customMinutes || null,
        locality: locality || "",
        createdAt: /* @__PURE__ */ new Date()
      };
      let savedReport = null;
      if (db) {
        try {
          savedReport = await ReportModel.create(reportPayload);
          if (matched?._id || matched?.slug) {
            await LocationModel.findOneAndUpdate(
              { $or: [{ _id: matched._id }, { slug: matched.slug }] },
              {
                status: status || "available",
                lastReportAt: /* @__PURE__ */ new Date(),
                $inc: { totalRecentReports: 1 }
              },
              { upsert: false }
            );
          }
        } catch (dbErr) {
          console.warn("MongoDB write notice:", dbErr.message);
        }
      }
      fallbackReports.unshift({
        _id: savedReport?._id ? String(savedReport._id) : `rep_${Date.now()}`,
        ...reportPayload,
        createdAt: reportPayload.createdAt.toISOString()
      });
      if (fallbackReports.length > 500) fallbackReports.pop();
      return res.status(201).json({
        success: true,
        message: "\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6! \u0986\u09AA\u09A8\u09BE\u09B0 \u09B0\u09BF\u09AA\u09CB\u09B0\u09CD\u099F\u099F\u09BF \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u0997\u09CD\u09B0\u09B9\u09A3 \u0995\u09B0\u09BE \u09B9\u09DF\u09C7\u099B\u09C7\u0964",
        data: savedReport || fallbackReports[0]
      });
    }
    if (pathname === "/reports/recent" || pathname === "/reports") {
      let reports = [];
      if (db) {
        try {
          reports = await ReportModel.find({ isFlagged: false }).sort({ createdAt: -1 }).limit(25).lean();
        } catch (e) {
          reports = fallbackReports;
        }
      }
      if (!reports || reports.length === 0) {
        reports = fallbackReports;
      }
      return res.status(200).json({
        success: true,
        count: reports.length,
        data: reports.slice(0, 20)
      });
    }
    if (pathname === "/locations/map-status" || pathname === "/locations/map") {
      if (db) {
        try {
          const dbLocations = await LocationModel.find({ isActive: true }).lean();
          if (dbLocations && dbLocations.length > 0) {
            const dbMap = new Map(dbLocations.map((l) => [l.slug || String(l._id), l]));
            defaultLocations.forEach((loc) => {
              const fromDb = dbMap.get(loc.slug) || dbMap.get(String(loc._id));
              if (fromDb && fromDb.lastReportAt) {
                loc.status = fromDb.status;
                loc.lastReportAt = fromDb.lastReportAt;
                loc.totalRecentReports = fromDb.totalRecentReports;
              }
            });
          }
        } catch (e) {
        }
      }
      let availableSummary = 0;
      let unavailableSummary = 0;
      let insufficientSummary = 0;
      defaultLocations.forEach((loc) => {
        if (loc.status === "available") availableSummary++;
        else if (loc.status === "unavailable") unavailableSummary++;
        else insufficientSummary++;
      });
      return res.status(200).json({
        success: true,
        count: defaultLocations.length,
        summary: {
          total: defaultLocations.length,
          available: availableSummary,
          unavailable: unavailableSummary,
          insufficient: insufficientSummary
        },
        data: defaultLocations
      });
    }
    if (pathname === "/locations/search") {
      const q = (url.searchParams.get("q") || "").toLowerCase().trim();
      if (!q) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      const results = defaultLocations.filter(
        (loc) => loc.nameBn?.toLowerCase().includes(q) || loc.nameEn?.toLowerCase().includes(q) || loc.district?.toLowerCase().includes(q) || loc.districtBn?.includes(q) || loc.division?.toLowerCase().includes(q) || loc.divisionBn?.includes(q) || loc.upazila && loc.upazila.toLowerCase().includes(q)
      ).slice(0, 15);
      return res.status(200).json({ success: true, count: results.length, data: results });
    }
    if (pathname === "/locations") {
      const division = url.searchParams.get("division");
      let results = defaultLocations;
      if (division && division !== "All") {
        results = defaultLocations.filter(
          (loc) => loc.division?.toLowerCase() === division.toLowerCase()
        );
      }
      return res.status(200).json({ success: true, count: results.length, data: results });
    }
    if (pathname.startsWith("/locations/") && !pathname.endsWith("/history")) {
      const idOrSlug = pathname.replace("/locations/", "");
      const matched = defaultLocations.find((l) => l._id === idOrSlug || l.slug === idOrSlug);
      if (!matched) {
        return res.status(404).json({ success: false, message: "Location not found" });
      }
      return res.status(200).json({
        success: true,
        data: {
          location: matched,
          status: matched.status || "insufficient_data",
          recentReports: fallbackReports.filter((r) => r.locationId?._id === matched._id).slice(0, 5)
        }
      });
    }
    if (pathname.startsWith("/locations/") && pathname.endsWith("/history")) {
      const idOrSlug = pathname.replace("/locations/", "").replace("/history", "");
      const matched = defaultLocations.find((l) => l._id === idOrSlug || l.slug === idOrSlug);
      return res.status(200).json({
        success: true,
        data: {
          location: matched || { nameBn: idOrSlug, nameEn: idOrSlug },
          periods: {
            "24h": { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            "48h": { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            "7d": { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            "30d": { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] },
            lifetime: { outageCount: 0, totalOutageMinutes: 0, uptimePercentage: 100, outageEvents: [], restorationEvents: [] }
          }
        }
      });
    }
    if (pathname === "/stats") {
      const availCount = defaultLocations.filter((l) => l.status === "available").length;
      const unavailCount = defaultLocations.filter((l) => l.status === "unavailable").length;
      return res.status(200).json({
        success: true,
        data: {
          totalReportsToday: fallbackReports.length,
          activeAreasCount: defaultLocations.length,
          areasAvailableCount: availCount,
          areasUnavailableCount: unavailCount,
          topOutageAreas: []
        }
      });
    }
    return res.status(200).json({
      success: true,
      service: "Electricity Status BD API",
      locations: defaultLocations.length
    });
  } catch (err) {
    console.error("API Handler Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// vite.config.js
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "api-serverless-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith("/api")) {
            try {
              await handleApiRequest(req, res);
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAiYXBpL19oYW5kbGVyLmpzIiwgImFwaS9fZGIuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxFbGVjdHJpY2l0eSBzdGF0dXMgQkRcXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxFbGVjdHJpY2l0eSBzdGF0dXMgQkRcXFxcY2xpZW50XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9wcm9qZWN0cy9FbGVjdHJpY2l0eSUyMHN0YXR1cyUyMEJEL2NsaWVudC92aXRlLmNvbmZpZy5qc1wiO1x1RkVGRmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IGhhbmRsZUFwaVJlcXVlc3QgfSBmcm9tICcuL2FwaS9faGFuZGxlci5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIHtcbiAgICAgIG5hbWU6ICdhcGktc2VydmVybGVzcy1taWRkbGV3YXJlJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgICBpZiAocmVxLnVybC5zdGFydHNXaXRoKCcvYXBpJykpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGF3YWl0IGhhbmRsZUFwaVJlcXVlc3QocmVxLCByZXMpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGVyci5tZXNzYWdlIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgfSxcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXHByb2plY3RzXFxcXEVsZWN0cmljaXR5IHN0YXR1cyBCRFxcXFxjbGllbnRcXFxcYXBpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxFbGVjdHJpY2l0eSBzdGF0dXMgQkRcXFxcY2xpZW50XFxcXGFwaVxcXFxfaGFuZGxlci5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovcHJvamVjdHMvRWxlY3RyaWNpdHklMjBzdGF0dXMlMjBCRC9jbGllbnQvYXBpL19oYW5kbGVyLmpzXCI7XHVGRUZGaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHsgY29ubmVjdFRvRGF0YWJhc2UsIExvY2F0aW9uTW9kZWwsIFJlcG9ydE1vZGVsIH0gZnJvbSAnLi9fZGIuanMnO1xuXG4vLyBSZWFkIHZlcmlmaWVkIG9mZmljaWFsIGRhdGFzZXRcbmxldCBkZWZhdWx0TG9jYXRpb25zID0gW107XG50cnkge1xuICBjb25zdCBsb2NhdGlvbnNQYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdzcmMnLCAnZGF0YScsICdiYW5nbGFkZXNoTG9jYXRpb25zLmpzb24nKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMobG9jYXRpb25zUGF0aCkpIHtcbiAgICBkZWZhdWx0TG9jYXRpb25zID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYXRpb25zUGF0aCwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYWx0UGF0aCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnY2xpZW50JywgJ3NyYycsICdkYXRhJywgJ2JhbmdsYWRlc2hMb2NhdGlvbnMuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGFsdFBhdGgpKSB7XG4gICAgICBkZWZhdWx0TG9jYXRpb25zID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoYWx0UGF0aCwgJ3V0ZjgnKSk7XG4gICAgfVxuICB9XG59IGNhdGNoIChlKSB7XG4gIGRlZmF1bHRMb2NhdGlvbnMgPSBbXTtcbn1cblxuLy8gRmFsbGJhY2sgaW4tbWVtb3J5IHJlcG9ydHMgaWYgTW9uZ29EQiBpcyBjb25uZWN0aW5nXG5sZXQgZmFsbGJhY2tSZXBvcnRzID0gW1xuICB7XG4gICAgX2lkOiAncmVwX2luaXRfMScsXG4gICAgbG9jYXRpb25JZDogeyBuYW1lQm46ICdcdTA5QUVcdTA5QkZcdTA5QjBcdTA5QUFcdTA5QzFcdTA5QjAnLCBuYW1lRW46ICdNaXJwdXInLCBkaXN0cmljdEJuOiAnXHUwOUEyXHUwOUJFXHUwOTk1XHUwOUJFJywgZGlzdHJpY3Q6ICdEaGFrYScsIGRpdmlzaW9uQm46ICdcdTA5QTJcdTA5QkVcdTA5OTVcdTA5QkUnLCBkaXZpc2lvbjogJ0RoYWthJyB9LFxuICAgIHN0YXR1czogJ2F2YWlsYWJsZScsXG4gICAgbG9jYWxpdHk6ICdcdTA5QjhcdTA5QzdcdTA5OTVcdTA5Q0RcdTA5OUZcdTA5QjAgXHUwOUU3JyxcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKERhdGUubm93KCkgLSAxNSAqIDYwMDAwKS50b0lTT1N0cmluZygpLFxuICB9LFxuICB7XG4gICAgX2lkOiAncmVwX2luaXRfMicsXG4gICAgbG9jYXRpb25JZDogeyBuYW1lQm46ICdcdTA5ODlcdTA5QTRcdTA5Q0RcdTA5QTRcdTA5QjBcdTA5QkUnLCBuYW1lRW46ICdVdHRhcmEnLCBkaXN0cmljdEJuOiAnXHUwOUEyXHUwOUJFXHUwOTk1XHUwOUJFJywgZGlzdHJpY3Q6ICdEaGFrYScsIGRpdmlzaW9uQm46ICdcdTA5QTJcdTA5QkVcdTA5OTVcdTA5QkUnLCBkaXZpc2lvbjogJ0RoYWthJyB9LFxuICAgIHN0YXR1czogJ2F2YWlsYWJsZScsXG4gICAgbG9jYWxpdHk6ICdcdTA5QjhcdTA5QzdcdTA5OTVcdTA5Q0RcdTA5OUZcdTA5QjAgXHUwOUVEJyxcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKERhdGUubm93KCkgLSA0NSAqIDYwMDAwKS50b0lTT1N0cmluZygpLFxuICB9LFxuXTtcblxuLy8gSGVscGVyIHRvIHBhcnNlIHJlcXVlc3QgYm9keSBpbiBzZXJ2ZXJsZXNzXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGFyc2VSZXF1ZXN0Qm9keShyZXEpIHtcbiAgaWYgKHJlcS5ib2R5ICYmIHR5cGVvZiByZXEuYm9keSA9PT0gJ29iamVjdCcpIHJldHVybiByZXEuYm9keTtcbiAgaWYgKHJlcS5ib2R5ICYmIHR5cGVvZiByZXEuYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIEpTT04ucGFyc2UocmVxLmJvZHkpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IGRhdGEgPSAnJztcbiAgICByZXEub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgIGRhdGEgKz0gY2h1bms7XG4gICAgfSk7XG4gICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlKGRhdGEgPyBKU09OLnBhcnNlKGRhdGEpIDoge30pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXNvbHZlKHt9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXEub24oJ2Vycm9yJywgKCkgPT4gcmVzb2x2ZSh7fSkpO1xuICB9KTtcbn1cblxuLy8gU2ltcGxlIHNlY3VyZSBKV1QgZ2VuZXJhdG9yXG5mdW5jdGlvbiBnZW5lcmF0ZVRva2VuKHBheWxvYWQsIHNlY3JldCkge1xuICBjb25zdCBoZWFkZXIgPSBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeSh7IGFsZzogJ0hTMjU2JywgdHlwOiAnSldUJyB9KSkudG9TdHJpbmcoJ2Jhc2U2NHVybCcpO1xuICBjb25zdCBib2R5ID0gQnVmZmVyLmZyb20oXG4gICAgSlNPTi5zdHJpbmdpZnkoeyAuLi5wYXlsb2FkLCBleHA6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApICsgNyAqIDg2NDAwIH0pXG4gICkudG9TdHJpbmcoJ2Jhc2U2NHVybCcpO1xuICBjb25zdCBzaWduYXR1cmUgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMjU2Jywgc2VjcmV0KS51cGRhdGUoYCR7aGVhZGVyfS4ke2JvZHl9YCkuZGlnZXN0KCdiYXNlNjR1cmwnKTtcbiAgcmV0dXJuIGAke2hlYWRlcn0uJHtib2R5fS4ke3NpZ25hdHVyZX1gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFuZGxlQXBpUmVxdWVzdChyZXEsIHJlcykge1xuICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscycsICd0cnVlJyk7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULE9QVElPTlMsUEFUQ0gsREVMRVRFLFBPU1QsUFVUJyk7XG4gIHJlcy5zZXRIZWFkZXIoXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLFxuICAgICdYLUNTUkYtVG9rZW4sIFgtUmVxdWVzdGVkLVdpdGgsIEFjY2VwdCwgQWNjZXB0LVZlcnNpb24sIENvbnRlbnQtTGVuZ3RoLCBDb250ZW50LU1ENSwgQ29udGVudC1UeXBlLCBEYXRlLCBYLUFwaS1WZXJzaW9uLCBBdXRob3JpemF0aW9uJ1xuICApO1xuICAvLyBFbnN1cmUgcmVhbC10aW1lIHN0YXR1cyBpcyBORVZFUiBjYWNoZWQgYnkgaW50ZXJtZWRpYXRlIHByb3hpZXNcbiAgcmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICduby1zdG9yZSwgbm8tY2FjaGUsIG11c3QtcmV2YWxpZGF0ZSwgcHJveHktcmV2YWxpZGF0ZScpO1xuXG4gIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmVuZCgpO1xuICB9XG5cbiAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsLCBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdCB8fCAnbG9jYWxob3N0J31gKTtcbiAgbGV0IHBhdGhuYW1lID0gdXJsLnBhdGhuYW1lLnJlcGxhY2UoL15cXC9hcGkvLCAnJyk7XG4gIGlmICghcGF0aG5hbWUgfHwgcGF0aG5hbWUgPT09ICcnKSBwYXRobmFtZSA9ICcvJztcblxuICAvLyBFbnN1cmUgREIgY29ubmVjdGlvblxuICBjb25zdCBkYiA9IGF3YWl0IGNvbm5lY3RUb0RhdGFiYXNlKCk7XG5cbiAgdHJ5IHtcbiAgICAvLyAxLiBIZWFsdGggY2hlY2tcbiAgICBpZiAocGF0aG5hbWUgPT09ICcvaGVhbHRoJyB8fCBwYXRobmFtZSA9PT0gJy8nKSB7XG4gICAgICBsZXQgZGJDb3VudCA9IDA7XG4gICAgICBpZiAoZGIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBkYkNvdW50ID0gYXdhaXQgUmVwb3J0TW9kZWwuY291bnREb2N1bWVudHMoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDIwMCkuanNvbih7XG4gICAgICAgIHN0YXR1czogJ29rJyxcbiAgICAgICAgc2VydmljZTogJ0VsZWN0cmljaXR5IFN0YXR1cyBCRCBBUEkgKFx1MDk5NVx1MDlCRVx1MDlCMFx1MDlDN1x1MDlBOFx1MDlDRFx1MDk5RiBcdTA5ODZcdTA5OUJcdTA5Qzc/KScsXG4gICAgICAgIGRhdGFiYXNlOiBkYiA/ICdNb25nb0RCIEF0bGFzIENvbm5lY3RlZCcgOiAnRmFsbGJhY2sgTG9jYWwgRGF0YXNldCcsXG4gICAgICAgIGxvY2F0aW9uc0NvdW50OiBkZWZhdWx0TG9jYXRpb25zLmxlbmd0aCxcbiAgICAgICAgcmVwb3J0c0NvdW50OiBkYkNvdW50IHx8IGZhbGxiYWNrUmVwb3J0cy5sZW5ndGgsXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gMi4gQWRtaW4gQXV0aGVudGljYXRpb24gKFBPU1QgL2FwaS9hZG1pbi9sb2dpbiBvciBQT1NUIC9hcGkvYXV0aC9sb2dpbilcbiAgICBpZiAoXG4gICAgICAocGF0aG5hbWUgPT09ICcvYWRtaW4vbG9naW4nIHx8IHBhdGhuYW1lID09PSAnL2F1dGgvbG9naW4nIHx8IHBhdGhuYW1lID09PSAnL2FkbWluJyB8fCBwYXRobmFtZSA9PT0gJy9hdXRoJykgJiZcbiAgICAgIHJlcS5tZXRob2QgPT09ICdQT1NUJ1xuICAgICkge1xuICAgICAgY29uc3QgYm9keSA9IGF3YWl0IHBhcnNlUmVxdWVzdEJvZHkocmVxKTtcbiAgICAgIGNvbnN0IHsgdXNlcm5hbWUsIHBhc3N3b3JkIH0gPSBib2R5O1xuXG4gICAgICBpZiAoIXVzZXJuYW1lIHx8ICFwYXNzd29yZCkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oe1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdcdTA5QUNcdTA5Q0RcdTA5QUZcdTA5QUNcdTA5QjlcdTA5QkVcdTA5QjBcdTA5OTVcdTA5QkVcdTA5QjBcdTA5QzBcdTA5QjAgXHUwOUE4XHUwOUJFXHUwOUFFIFx1MDk5MyBcdTA5QUFcdTA5QkVcdTA5QjhcdTA5OTNcdTA5QUZcdTA5QkNcdTA5QkVcdTA5QjBcdTA5Q0RcdTA5QTEgXHUwOUFBXHUwOUNEXHUwOUIwXHUwOUE2XHUwOUJFXHUwOUE4IFx1MDk5NVx1MDlCMFx1MDlDMVx1MDlBOFx1MDk2NCcsXG4gICAgICAgICAgbWVzc2FnZUVuOiAnVXNlcm5hbWUgYW5kIHBhc3N3b3JkIHJlcXVpcmVkLicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbnZVc2VyID0gcHJvY2Vzcy5lbnYuQURNSU5fVVNFUk5BTUUgfHwgJ2FkbWluJztcbiAgICAgIGNvbnN0IGVudlBhc3MgPSBwcm9jZXNzLmVudi5BRE1JTl9QQVNTV09SRCB8fCAnY3VycmVudEJEMjAyNiEnO1xuICAgICAgY29uc3Qgand0U2VjcmV0ID0gcHJvY2Vzcy5lbnYuSldUX1NFQ1JFVCB8fCAnZWxlY3RyaWNpdHktc3RhdHVzLWJkLXN1cGVyLXNlY3JldC1qd3Qta2V5LTIwMjYnO1xuXG4gICAgICBpZiAodXNlcm5hbWUgPT09IGVudlVzZXIgJiYgcGFzc3dvcmQgPT09IGVudlBhc3MpIHtcbiAgICAgICAgY29uc3QgdG9rZW4gPSBnZW5lcmF0ZVRva2VuKHsgdXNlcm5hbWUsIHJvbGU6ICdhZG1pbicgfSwgand0U2VjcmV0KTtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdcdTA5QjJcdTA5OTdcdTA5ODdcdTA5QTggXHUwOUI4XHUwOUFCXHUwOUIyIFx1MDlCOVx1MDlBRlx1MDlCQ1x1MDlDN1x1MDk5Qlx1MDlDN1x1MDk2NCcsXG4gICAgICAgICAgdG9rZW4sXG4gICAgICAgICAgYWRtaW46IHtcbiAgICAgICAgICAgIHVzZXJuYW1lLFxuICAgICAgICAgICAgcm9sZTogJ2FkbWluJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ1x1MDlBRFx1MDlDMVx1MDlCMiBcdTA5QUNcdTA5Q0RcdTA5QUZcdTA5QUNcdTA5QjlcdTA5QkVcdTA5QjBcdTA5OTVcdTA5QkVcdTA5QjBcdTA5QzBcdTA5QjAgXHUwOUE4XHUwOUJFXHUwOUFFIFx1MDk4NVx1MDlBNVx1MDlBQ1x1MDlCRSBcdTA5QUFcdTA5QkVcdTA5QjhcdTA5OTNcdTA5QUZcdTA5QkNcdTA5QkVcdTA5QjBcdTA5Q0RcdTA5QTFcdTA5NjQnLFxuICAgICAgICAgIG1lc3NhZ2VFbjogJ0ludmFsaWQgdXNlcm5hbWUgb3IgcGFzc3dvcmQuJyxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gMy4gQWRtaW4gUmVwb3J0cyBJbnNwZWN0aW9uIChHRVQgL2FwaS9hZG1pbi9yZXBvcnRzKVxuICAgIGlmIChwYXRobmFtZSA9PT0gJy9hZG1pbi9yZXBvcnRzJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgbGV0IHJlcG9ydHMgPSBbXTtcbiAgICAgIGlmIChkYikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJlcG9ydHMgPSBhd2FpdCBSZXBvcnRNb2RlbC5maW5kKCkuc29ydCh7IGNyZWF0ZWRBdDogLTEgfSkubGltaXQoMTAwKS5sZWFuKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXBvcnRzID0gZmFsbGJhY2tSZXBvcnRzO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXBvcnRzID0gZmFsbGJhY2tSZXBvcnRzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgdG90YWw6IHJlcG9ydHMubGVuZ3RoLFxuICAgICAgICBwYWdlOiAxLFxuICAgICAgICBwYWdlczogMSxcbiAgICAgICAgZGF0YTogcmVwb3J0cyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIDQuIFJlcG9ydHM6IFN1Ym1pdCAoUE9TVCAvYXBpL3JlcG9ydHMpXG4gICAgaWYgKChwYXRobmFtZSA9PT0gJy9yZXBvcnRzJyB8fCBwYXRobmFtZS5zdGFydHNXaXRoKCcvcmVwb3J0cycpKSAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgIGNvbnN0IGJvZHkgPSBhd2FpdCBwYXJzZVJlcXVlc3RCb2R5KHJlcSk7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGxvY2F0aW9uSWQsXG4gICAgICAgIGxvY2F0aW9uTmFtZSxcbiAgICAgICAgZGlzdHJpY3QsXG4gICAgICAgIGRpdmlzaW9uLFxuICAgICAgICBsYXRpdHVkZSxcbiAgICAgICAgbG9uZ2l0dWRlLFxuICAgICAgICBpc0dwc0N1c3RvbSxcbiAgICAgICAgc3RhdHVzLFxuICAgICAgICBkdXJhdGlvbixcbiAgICAgICAgbG9jYWxpdHksXG4gICAgICAgIGN1c3RvbU1pbnV0ZXMsXG4gICAgICB9ID0gYm9keTtcblxuICAgICAgaWYgKCFsb2NhdGlvbklkICYmICghbGF0aXR1ZGUgfHwgIWxvbmdpdHVkZSkgJiYgIWxvY2F0aW9uTmFtZSkge1xuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLmpzb24oe1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdcdTA5OEZcdTA5QjJcdTA5QkVcdTA5OTVcdTA5QkUgXHUwOUE4XHUwOUJGXHUwOUIwXHUwOUNEXHUwOUFDXHUwOUJFXHUwOTlBXHUwOUE4IFx1MDk5NVx1MDlCMFx1MDlCRSBcdTA5QUNcdTA5QkVcdTA5QTdcdTA5Q0RcdTA5QUZcdTA5QTRcdTA5QkVcdTA5QUVcdTA5QzJcdTA5QjJcdTA5OTVcdTA5NjQnLFxuICAgICAgICAgIG1lc3NhZ2VFbjogJ0xvY2F0aW9uIHJlcXVpcmVkLicsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBsZXQgbWF0Y2hlZCA9IGRlZmF1bHRMb2NhdGlvbnMuZmluZChcbiAgICAgICAgKGwpID0+XG4gICAgICAgICAgbC5faWQgPT09IGxvY2F0aW9uSWQgfHxcbiAgICAgICAgICBsLnNsdWcgPT09IGxvY2F0aW9uSWQgfHxcbiAgICAgICAgICAobG9jYXRpb25OYW1lICYmIChsLm5hbWVCbiA9PT0gbG9jYXRpb25OYW1lIHx8IGwubmFtZUVuID09PSBsb2NhdGlvbk5hbWUpKVxuICAgICAgKTtcblxuICAgICAgLy8gSWYgdXNlciByZXBvcnRlZCBmcm9tIEdQUyBjb29yZGluYXRlcyBvdXRzaWRlIGV4aXN0aW5nIDU5MzpcbiAgICAgIGlmICghbWF0Y2hlZCAmJiAoaXNHcHNDdXN0b20gfHwgKGxhdGl0dWRlICYmIGxvbmdpdHVkZSkpKSB7XG4gICAgICAgIG1hdGNoZWQgPSB7XG4gICAgICAgICAgX2lkOiBsb2NhdGlvbklkIHx8IGBncHNfJHtEYXRlLm5vdygpfWAsXG4gICAgICAgICAgbmFtZUJuOiBsb2NhdGlvbk5hbWUgfHwgYFx1MDlBRVx1MDlDRFx1MDlBRlx1MDlCRVx1MDlBQSBcdTA5ODVcdTA5QUNcdTA5QjhcdTA5Q0RcdTA5QTVcdTA5QkVcdTA5QThgLFxuICAgICAgICAgIG5hbWVFbjogbG9jYXRpb25OYW1lIHx8IGBNYXAgTG9jYXRpb25gLFxuICAgICAgICAgIGRpc3RyaWN0OiBkaXN0cmljdCB8fCAnXHUwOUFDXHUwOUJFXHUwOTgyXHUwOUIyXHUwOUJFXHUwOUE2XHUwOUM3XHUwOUI2JyxcbiAgICAgICAgICBkaXN0cmljdEJuOiBkaXN0cmljdCB8fCAnXHUwOUFDXHUwOUJFXHUwOTgyXHUwOUIyXHUwOUJFXHUwOUE2XHUwOUM3XHUwOUI2JyxcbiAgICAgICAgICBkaXZpc2lvbjogZGl2aXNpb24gfHwgJ0RoYWthJyxcbiAgICAgICAgICBkaXZpc2lvbkJuOiBkaXZpc2lvbiB8fCAnXHUwOUEyXHUwOUJFXHUwOTk1XHUwOUJFJyxcbiAgICAgICAgICBsYXRpdHVkZTogTnVtYmVyKGxhdGl0dWRlKSB8fCAyMy44MTAzLFxuICAgICAgICAgIGxvbmdpdHVkZTogTnVtYmVyKGxvbmdpdHVkZSkgfHwgOTAuNDEyNSxcbiAgICAgICAgICBzdGF0dXM6IHN0YXR1cyB8fCAnYXZhaWxhYmxlJyxcbiAgICAgICAgICB0b3RhbFJlY2VudFJlcG9ydHM6IDEsXG4gICAgICAgICAgYXZhaWxhYmxlUGVyY2VudGFnZTogc3RhdHVzID09PSAnYXZhaWxhYmxlJyA/IDEwMCA6IDAsXG4gICAgICAgICAgdW5hdmFpbGFibGVQZXJjZW50YWdlOiBzdGF0dXMgPT09ICd1bmF2YWlsYWJsZScgPyAxMDAgOiAwLFxuICAgICAgICAgIGxhc3RSZXBvcnRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB9O1xuICAgICAgICBkZWZhdWx0TG9jYXRpb25zLnB1c2gobWF0Y2hlZCk7XG4gICAgICB9IGVsc2UgaWYgKG1hdGNoZWQpIHtcbiAgICAgICAgLy8gUEVSTUFORU5UIFNUQVRVUyBVUERBVEU6IFRoZSBsYXRlc3QgdmFsaWQgY29tbXVuaXR5IHJlcG9ydCBzZXRzIGFjdGl2ZSBzdGF0dXMgaW5kZWZpbml0ZWx5XG4gICAgICAgIG1hdGNoZWQuc3RhdHVzID0gc3RhdHVzIHx8ICdhdmFpbGFibGUnO1xuICAgICAgICBtYXRjaGVkLmxhc3RSZXBvcnRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgbWF0Y2hlZC50b3RhbFJlY2VudFJlcG9ydHMgPSAobWF0Y2hlZC50b3RhbFJlY2VudFJlcG9ydHMgfHwgMCkgKyAxO1xuICAgICAgICBpZiAoc3RhdHVzID09PSAnYXZhaWxhYmxlJykge1xuICAgICAgICAgIG1hdGNoZWQuYXZhaWxhYmxlUGVyY2VudGFnZSA9IDEwMDtcbiAgICAgICAgICBtYXRjaGVkLnVuYXZhaWxhYmxlUGVyY2VudGFnZSA9IDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2hlZC5hdmFpbGFibGVQZXJjZW50YWdlID0gMDtcbiAgICAgICAgICBtYXRjaGVkLnVuYXZhaWxhYmxlUGVyY2VudGFnZSA9IDEwMDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCByZXBvcnRQYXlsb2FkID0ge1xuICAgICAgICBsb2NhdGlvbklkOiBtYXRjaGVkXG4gICAgICAgICAgPyB7XG4gICAgICAgICAgICAgIF9pZDogbWF0Y2hlZC5faWQsXG4gICAgICAgICAgICAgIG5hbWVCbjogbWF0Y2hlZC5uYW1lQm4sXG4gICAgICAgICAgICAgIG5hbWVFbjogbWF0Y2hlZC5uYW1lRW4sXG4gICAgICAgICAgICAgIGRpc3RyaWN0Qm46IG1hdGNoZWQuZGlzdHJpY3RCbixcbiAgICAgICAgICAgICAgZGlzdHJpY3Q6IG1hdGNoZWQuZGlzdHJpY3QsXG4gICAgICAgICAgICAgIGRpdmlzaW9uQm46IG1hdGNoZWQuZGl2aXNpb25CbixcbiAgICAgICAgICAgICAgZGl2aXNpb246IG1hdGNoZWQuZGl2aXNpb24sXG4gICAgICAgICAgICAgIHNsdWc6IG1hdGNoZWQuc2x1ZyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICA6IHsgbmFtZUJuOiBsb2NhdGlvbk5hbWUgfHwgJ1x1MDk4Rlx1MDlCMlx1MDlCRVx1MDk5NVx1MDlCRScsIG5hbWVFbjogJ0FyZWEnLCBkaXN0cmljdEJuOiAnXHUwOUEyXHUwOUJFXHUwOTk1XHUwOUJFJywgZGlzdHJpY3Q6ICdEaGFrYScgfSxcbiAgICAgICAgc3RhdHVzOiBzdGF0dXMgfHwgJ2F2YWlsYWJsZScsXG4gICAgICAgIGR1cmF0aW9uOiBkdXJhdGlvbiB8fCAnanVzdF9ub3cnLFxuICAgICAgICBjdXN0b21NaW51dGVzOiBjdXN0b21NaW51dGVzIHx8IG51bGwsXG4gICAgICAgIGxvY2FsaXR5OiBsb2NhbGl0eSB8fCAnJyxcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgfTtcblxuICAgICAgLy8gU2F2ZSB0byBNb25nb0RCIEF0bGFzXG4gICAgICBsZXQgc2F2ZWRSZXBvcnQgPSBudWxsO1xuICAgICAgaWYgKGRiKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgc2F2ZWRSZXBvcnQgPSBhd2FpdCBSZXBvcnRNb2RlbC5jcmVhdGUocmVwb3J0UGF5bG9hZCk7XG5cbiAgICAgICAgICAvLyBVcGRhdGUgTG9jYXRpb24gaW4gTW9uZ29EQlxuICAgICAgICAgIGlmIChtYXRjaGVkPy5faWQgfHwgbWF0Y2hlZD8uc2x1Zykge1xuICAgICAgICAgICAgYXdhaXQgTG9jYXRpb25Nb2RlbC5maW5kT25lQW5kVXBkYXRlKFxuICAgICAgICAgICAgICB7ICRvcjogW3sgX2lkOiBtYXRjaGVkLl9pZCB9LCB7IHNsdWc6IG1hdGNoZWQuc2x1ZyB9XSB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3RhdHVzOiBzdGF0dXMgfHwgJ2F2YWlsYWJsZScsXG4gICAgICAgICAgICAgICAgbGFzdFJlcG9ydEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgICRpbmM6IHsgdG90YWxSZWNlbnRSZXBvcnRzOiAxIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHsgdXBzZXJ0OiBmYWxzZSB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZGJFcnIpIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJ01vbmdvREIgd3JpdGUgbm90aWNlOicsIGRiRXJyLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGZhbGxiYWNrUmVwb3J0cy51bnNoaWZ0KHtcbiAgICAgICAgX2lkOiBzYXZlZFJlcG9ydD8uX2lkID8gU3RyaW5nKHNhdmVkUmVwb3J0Ll9pZCkgOiBgcmVwXyR7RGF0ZS5ub3coKX1gLFxuICAgICAgICAuLi5yZXBvcnRQYXlsb2FkLFxuICAgICAgICBjcmVhdGVkQXQ6IHJlcG9ydFBheWxvYWQuY3JlYXRlZEF0LnRvSVNPU3RyaW5nKCksXG4gICAgICB9KTtcbiAgICAgIGlmIChmYWxsYmFja1JlcG9ydHMubGVuZ3RoID4gNTAwKSBmYWxsYmFja1JlcG9ydHMucG9wKCk7XG5cbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDIwMSkuanNvbih7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6ICdcdTA5QTdcdTA5QThcdTA5Q0RcdTA5QUZcdTA5QUNcdTA5QkVcdTA5QTYhIFx1MDk4Nlx1MDlBQVx1MDlBOFx1MDlCRVx1MDlCMCBcdTA5QjBcdTA5QkZcdTA5QUFcdTA5Q0JcdTA5QjBcdTA5Q0RcdTA5OUZcdTA5OUZcdTA5QkYgXHUwOUI4XHUwOUFCXHUwOUIyXHUwOUFEXHUwOUJFXHUwOUFDXHUwOUM3IFx1MDk5N1x1MDlDRFx1MDlCMFx1MDlCOVx1MDlBMyBcdTA5OTVcdTA5QjBcdTA5QkUgXHUwOUI5XHUwOURGXHUwOUM3XHUwOTlCXHUwOUM3XHUwOTY0JyxcbiAgICAgICAgZGF0YTogc2F2ZWRSZXBvcnQgfHwgZmFsbGJhY2tSZXBvcnRzWzBdLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gNS4gUmVwb3J0czogUmVjZW50IHRpY2tlciAoR0VUIC9hcGkvcmVwb3J0cy9yZWNlbnQgb3IgR0VUIC9hcGkvcmVwb3J0cylcbiAgICBpZiAocGF0aG5hbWUgPT09ICcvcmVwb3J0cy9yZWNlbnQnIHx8IHBhdGhuYW1lID09PSAnL3JlcG9ydHMnKSB7XG4gICAgICBsZXQgcmVwb3J0cyA9IFtdO1xuICAgICAgaWYgKGRiKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVwb3J0cyA9IGF3YWl0IFJlcG9ydE1vZGVsLmZpbmQoeyBpc0ZsYWdnZWQ6IGZhbHNlIH0pLnNvcnQoeyBjcmVhdGVkQXQ6IC0xIH0pLmxpbWl0KDI1KS5sZWFuKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICByZXBvcnRzID0gZmFsbGJhY2tSZXBvcnRzO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIXJlcG9ydHMgfHwgcmVwb3J0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmVwb3J0cyA9IGZhbGxiYWNrUmVwb3J0cztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgY291bnQ6IHJlcG9ydHMubGVuZ3RoLFxuICAgICAgICBkYXRhOiByZXBvcnRzLnNsaWNlKDAsIDIwKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIDYuIExvY2F0aW9uczogTWFwIFN0YXR1cyAoR0VUIC9hcGkvbG9jYXRpb25zL21hcC1zdGF0dXMpXG4gICAgaWYgKHBhdGhuYW1lID09PSAnL2xvY2F0aW9ucy9tYXAtc3RhdHVzJyB8fCBwYXRobmFtZSA9PT0gJy9sb2NhdGlvbnMvbWFwJykge1xuICAgICAgLy8gSWYgREIgaGFzIHVwZGF0ZWQgbG9jYXRpb25zLCBtZXJnZSB0aGVpciBsaXZlIHN0YXR1cyBpbnRvIGRlZmF1bHRMb2NhdGlvbnNcbiAgICAgIGlmIChkYikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGRiTG9jYXRpb25zID0gYXdhaXQgTG9jYXRpb25Nb2RlbC5maW5kKHsgaXNBY3RpdmU6IHRydWUgfSkubGVhbigpO1xuICAgICAgICAgIGlmIChkYkxvY2F0aW9ucyAmJiBkYkxvY2F0aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkYk1hcCA9IG5ldyBNYXAoZGJMb2NhdGlvbnMubWFwKChsKSA9PiBbbC5zbHVnIHx8IFN0cmluZyhsLl9pZCksIGxdKSk7XG4gICAgICAgICAgICBkZWZhdWx0TG9jYXRpb25zLmZvckVhY2goKGxvYykgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBmcm9tRGIgPSBkYk1hcC5nZXQobG9jLnNsdWcpIHx8IGRiTWFwLmdldChTdHJpbmcobG9jLl9pZCkpO1xuICAgICAgICAgICAgICBpZiAoZnJvbURiICYmIGZyb21EYi5sYXN0UmVwb3J0QXQpIHtcbiAgICAgICAgICAgICAgICBsb2Muc3RhdHVzID0gZnJvbURiLnN0YXR1cztcbiAgICAgICAgICAgICAgICBsb2MubGFzdFJlcG9ydEF0ID0gZnJvbURiLmxhc3RSZXBvcnRBdDtcbiAgICAgICAgICAgICAgICBsb2MudG90YWxSZWNlbnRSZXBvcnRzID0gZnJvbURiLnRvdGFsUmVjZW50UmVwb3J0cztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgfVxuXG4gICAgICBsZXQgYXZhaWxhYmxlU3VtbWFyeSA9IDA7XG4gICAgICBsZXQgdW5hdmFpbGFibGVTdW1tYXJ5ID0gMDtcbiAgICAgIGxldCBpbnN1ZmZpY2llbnRTdW1tYXJ5ID0gMDtcblxuICAgICAgZGVmYXVsdExvY2F0aW9ucy5mb3JFYWNoKChsb2MpID0+IHtcbiAgICAgICAgaWYgKGxvYy5zdGF0dXMgPT09ICdhdmFpbGFibGUnKSBhdmFpbGFibGVTdW1tYXJ5Kys7XG4gICAgICAgIGVsc2UgaWYgKGxvYy5zdGF0dXMgPT09ICd1bmF2YWlsYWJsZScpIHVuYXZhaWxhYmxlU3VtbWFyeSsrO1xuICAgICAgICBlbHNlIGluc3VmZmljaWVudFN1bW1hcnkrKztcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gcmVzLnN0YXR1cygyMDApLmpzb24oe1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBjb3VudDogZGVmYXVsdExvY2F0aW9ucy5sZW5ndGgsXG4gICAgICAgIHN1bW1hcnk6IHtcbiAgICAgICAgICB0b3RhbDogZGVmYXVsdExvY2F0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgYXZhaWxhYmxlOiBhdmFpbGFibGVTdW1tYXJ5LFxuICAgICAgICAgIHVuYXZhaWxhYmxlOiB1bmF2YWlsYWJsZVN1bW1hcnksXG4gICAgICAgICAgaW5zdWZmaWNpZW50OiBpbnN1ZmZpY2llbnRTdW1tYXJ5LFxuICAgICAgICB9LFxuICAgICAgICBkYXRhOiBkZWZhdWx0TG9jYXRpb25zLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gNy4gTG9jYXRpb25zOiBTZWFyY2hcbiAgICBpZiAocGF0aG5hbWUgPT09ICcvbG9jYXRpb25zL3NlYXJjaCcpIHtcbiAgICAgIGNvbnN0IHEgPSAodXJsLnNlYXJjaFBhcmFtcy5nZXQoJ3EnKSB8fCAnJykudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gICAgICBpZiAoIXEpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3VjY2VzczogdHJ1ZSwgY291bnQ6IDAsIGRhdGE6IFtdIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByZXN1bHRzID0gZGVmYXVsdExvY2F0aW9uc1xuICAgICAgICAuZmlsdGVyKFxuICAgICAgICAgIChsb2MpID0+XG4gICAgICAgICAgICBsb2MubmFtZUJuPy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpIHx8XG4gICAgICAgICAgICBsb2MubmFtZUVuPy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpIHx8XG4gICAgICAgICAgICBsb2MuZGlzdHJpY3Q/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocSkgfHxcbiAgICAgICAgICAgIGxvYy5kaXN0cmljdEJuPy5pbmNsdWRlcyhxKSB8fFxuICAgICAgICAgICAgbG9jLmRpdmlzaW9uPy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpIHx8XG4gICAgICAgICAgICBsb2MuZGl2aXNpb25Cbj8uaW5jbHVkZXMocSkgfHxcbiAgICAgICAgICAgIChsb2MudXBhemlsYSAmJiBsb2MudXBhemlsYS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpKVxuICAgICAgICApXG4gICAgICAgIC5zbGljZSgwLCAxNSk7XG5cbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDIwMCkuanNvbih7IHN1Y2Nlc3M6IHRydWUsIGNvdW50OiByZXN1bHRzLmxlbmd0aCwgZGF0YTogcmVzdWx0cyB9KTtcbiAgICB9XG5cbiAgICAvLyA4LiBMb2NhdGlvbnM6IExpc3Qgd2l0aCBvcHRpb25hbCBkaXZpc2lvbiBmaWx0ZXJcbiAgICBpZiAocGF0aG5hbWUgPT09ICcvbG9jYXRpb25zJykge1xuICAgICAgY29uc3QgZGl2aXNpb24gPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnZGl2aXNpb24nKTtcbiAgICAgIGxldCByZXN1bHRzID0gZGVmYXVsdExvY2F0aW9ucztcbiAgICAgIGlmIChkaXZpc2lvbiAmJiBkaXZpc2lvbiAhPT0gJ0FsbCcpIHtcbiAgICAgICAgcmVzdWx0cyA9IGRlZmF1bHRMb2NhdGlvbnMuZmlsdGVyKFxuICAgICAgICAgIChsb2MpID0+IGxvYy5kaXZpc2lvbj8udG9Mb3dlckNhc2UoKSA9PT0gZGl2aXNpb24udG9Mb3dlckNhc2UoKVxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHsgc3VjY2VzczogdHJ1ZSwgY291bnQ6IHJlc3VsdHMubGVuZ3RoLCBkYXRhOiByZXN1bHRzIH0pO1xuICAgIH1cblxuICAgIC8vIDkuIExvY2F0aW9uczogU2luZ2xlIGJ5IElEIG9yIFNsdWdcbiAgICBpZiAocGF0aG5hbWUuc3RhcnRzV2l0aCgnL2xvY2F0aW9ucy8nKSAmJiAhcGF0aG5hbWUuZW5kc1dpdGgoJy9oaXN0b3J5JykpIHtcbiAgICAgIGNvbnN0IGlkT3JTbHVnID0gcGF0aG5hbWUucmVwbGFjZSgnL2xvY2F0aW9ucy8nLCAnJyk7XG4gICAgICBjb25zdCBtYXRjaGVkID0gZGVmYXVsdExvY2F0aW9ucy5maW5kKChsKSA9PiBsLl9pZCA9PT0gaWRPclNsdWcgfHwgbC5zbHVnID09PSBpZE9yU2x1Zyk7XG4gICAgICBpZiAoIW1hdGNoZWQpIHtcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6ICdMb2NhdGlvbiBub3QgZm91bmQnIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGxvY2F0aW9uOiBtYXRjaGVkLFxuICAgICAgICAgIHN0YXR1czogbWF0Y2hlZC5zdGF0dXMgfHwgJ2luc3VmZmljaWVudF9kYXRhJyxcbiAgICAgICAgICByZWNlbnRSZXBvcnRzOiBmYWxsYmFja1JlcG9ydHMuZmlsdGVyKChyKSA9PiByLmxvY2F0aW9uSWQ/Ll9pZCA9PT0gbWF0Y2hlZC5faWQpLnNsaWNlKDAsIDUpLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gMTAuIExvY2F0aW9uczogSGlzdG9yeVxuICAgIGlmIChwYXRobmFtZS5zdGFydHNXaXRoKCcvbG9jYXRpb25zLycpICYmIHBhdGhuYW1lLmVuZHNXaXRoKCcvaGlzdG9yeScpKSB7XG4gICAgICBjb25zdCBpZE9yU2x1ZyA9IHBhdGhuYW1lLnJlcGxhY2UoJy9sb2NhdGlvbnMvJywgJycpLnJlcGxhY2UoJy9oaXN0b3J5JywgJycpO1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IGRlZmF1bHRMb2NhdGlvbnMuZmluZCgobCkgPT4gbC5faWQgPT09IGlkT3JTbHVnIHx8IGwuc2x1ZyA9PT0gaWRPclNsdWcpO1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIGxvY2F0aW9uOiBtYXRjaGVkIHx8IHsgbmFtZUJuOiBpZE9yU2x1ZywgbmFtZUVuOiBpZE9yU2x1ZyB9LFxuICAgICAgICAgIHBlcmlvZHM6IHtcbiAgICAgICAgICAgICcyNGgnOiB7IG91dGFnZUNvdW50OiAwLCB0b3RhbE91dGFnZU1pbnV0ZXM6IDAsIHVwdGltZVBlcmNlbnRhZ2U6IDEwMCwgb3V0YWdlRXZlbnRzOiBbXSwgcmVzdG9yYXRpb25FdmVudHM6IFtdIH0sXG4gICAgICAgICAgICAnNDhoJzogeyBvdXRhZ2VDb3VudDogMCwgdG90YWxPdXRhZ2VNaW51dGVzOiAwLCB1cHRpbWVQZXJjZW50YWdlOiAxMDAsIG91dGFnZUV2ZW50czogW10sIHJlc3RvcmF0aW9uRXZlbnRzOiBbXSB9LFxuICAgICAgICAgICAgJzdkJzogeyBvdXRhZ2VDb3VudDogMCwgdG90YWxPdXRhZ2VNaW51dGVzOiAwLCB1cHRpbWVQZXJjZW50YWdlOiAxMDAsIG91dGFnZUV2ZW50czogW10sIHJlc3RvcmF0aW9uRXZlbnRzOiBbXSB9LFxuICAgICAgICAgICAgJzMwZCc6IHsgb3V0YWdlQ291bnQ6IDAsIHRvdGFsT3V0YWdlTWludXRlczogMCwgdXB0aW1lUGVyY2VudGFnZTogMTAwLCBvdXRhZ2VFdmVudHM6IFtdLCByZXN0b3JhdGlvbkV2ZW50czogW10gfSxcbiAgICAgICAgICAgIGxpZmV0aW1lOiB7IG91dGFnZUNvdW50OiAwLCB0b3RhbE91dGFnZU1pbnV0ZXM6IDAsIHVwdGltZVBlcmNlbnRhZ2U6IDEwMCwgb3V0YWdlRXZlbnRzOiBbXSwgcmVzdG9yYXRpb25FdmVudHM6IFtdIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIDExLiBTdGF0c1xuICAgIGlmIChwYXRobmFtZSA9PT0gJy9zdGF0cycpIHtcbiAgICAgIGNvbnN0IGF2YWlsQ291bnQgPSBkZWZhdWx0TG9jYXRpb25zLmZpbHRlcigobCkgPT4gbC5zdGF0dXMgPT09ICdhdmFpbGFibGUnKS5sZW5ndGg7XG4gICAgICBjb25zdCB1bmF2YWlsQ291bnQgPSBkZWZhdWx0TG9jYXRpb25zLmZpbHRlcigobCkgPT4gbC5zdGF0dXMgPT09ICd1bmF2YWlsYWJsZScpLmxlbmd0aDtcblxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHRvdGFsUmVwb3J0c1RvZGF5OiBmYWxsYmFja1JlcG9ydHMubGVuZ3RoLFxuICAgICAgICAgIGFjdGl2ZUFyZWFzQ291bnQ6IGRlZmF1bHRMb2NhdGlvbnMubGVuZ3RoLFxuICAgICAgICAgIGFyZWFzQXZhaWxhYmxlQ291bnQ6IGF2YWlsQ291bnQsXG4gICAgICAgICAgYXJlYXNVbmF2YWlsYWJsZUNvdW50OiB1bmF2YWlsQ291bnQsXG4gICAgICAgICAgdG9wT3V0YWdlQXJlYXM6IFtdLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcy5zdGF0dXMoMjAwKS5qc29uKHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBzZXJ2aWNlOiAnRWxlY3RyaWNpdHkgU3RhdHVzIEJEIEFQSScsXG4gICAgICBsb2NhdGlvbnM6IGRlZmF1bHRMb2NhdGlvbnMubGVuZ3RoLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKCdBUEkgSGFuZGxlciBFcnJvcjonLCBlcnIpO1xuICAgIHJldHVybiByZXMuc3RhdHVzKDUwMCkuanNvbih7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gIH1cbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxwcm9qZWN0c1xcXFxFbGVjdHJpY2l0eSBzdGF0dXMgQkRcXFxcY2xpZW50XFxcXGFwaVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxccHJvamVjdHNcXFxcRWxlY3RyaWNpdHkgc3RhdHVzIEJEXFxcXGNsaWVudFxcXFxhcGlcXFxcX2RiLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9wcm9qZWN0cy9FbGVjdHJpY2l0eSUyMHN0YXR1cyUyMEJEL2NsaWVudC9hcGkvX2RiLmpzXCI7XHVGRUZGaW1wb3J0IG1vbmdvb3NlIGZyb20gJ21vbmdvb3NlJztcbmltcG9ydCBkbnMgZnJvbSAnZG5zJztcblxuLy8gRmFsbGJhY2sgRE5TIHRvIEdvb2dsZSAmIENsb3VkZmxhcmUgRE5TIGluIGNhc2UgbG9jYWwvbGFtYmRhIEROUyBmYWlscyBvbiBTUlZcbnRyeSB7XG4gIGRucy5zZXRTZXJ2ZXJzKFsnOC44LjguOCcsICcxLjEuMS4xJywgJzguOC40LjQnXSk7XG59IGNhdGNoIChlKSB7fVxuXG5jb25zdCBNT05HT0RCX1VSSSA9XG4gIHByb2Nlc3MuZW52Lk1PTkdPREJfVVJJIHx8XG4gICdtb25nb2RiK3NydjovL2ZhaGFkaG9zc2FpbjA0X2RiX3VzZXI6VmR4VXJIeWdJRnp2akxvYkBjbHVzdGVyMC5xbmlndXJzLm1vbmdvZGIubmV0L2VsZWN0cmljaXR5X3N0YXR1c19iZD9yZXRyeVdyaXRlcz10cnVlJnc9bWFqb3JpdHkmYXBwTmFtZT1DbHVzdGVyMCc7XG5cbmxldCBjYWNoZWQgPSBnbG9iYWwubW9uZ29vc2U7XG5pZiAoIWNhY2hlZCkge1xuICBjYWNoZWQgPSBnbG9iYWwubW9uZ29vc2UgPSB7IGNvbm46IG51bGwsIHByb21pc2U6IG51bGwgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbm5lY3RUb0RhdGFiYXNlKCkge1xuICBpZiAoY2FjaGVkLmNvbm4gJiYgbW9uZ29vc2UuY29ubmVjdGlvbi5yZWFkeVN0YXRlID09PSAxKSB7XG4gICAgcmV0dXJuIGNhY2hlZC5jb25uO1xuICB9XG5cbiAgaWYgKCFjYWNoZWQucHJvbWlzZSkge1xuICAgIGNvbnN0IG9wdHMgPSB7XG4gICAgICBidWZmZXJDb21tYW5kczogZmFsc2UsXG4gICAgICBzZXJ2ZXJTZWxlY3Rpb25UaW1lb3V0TVM6IDUwMDAsXG4gICAgICBjb25uZWN0VGltZW91dE1TOiA1MDAwLFxuICAgICAgZmFtaWx5OiA0LFxuICAgIH07XG4gICAgY2FjaGVkLnByb21pc2UgPSBtb25nb29zZVxuICAgICAgLmNvbm5lY3QoTU9OR09EQl9VUkksIG9wdHMpXG4gICAgICAudGhlbigobSkgPT4ge1xuICAgICAgICByZXR1cm4gbTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBjb25zb2xlLndhcm4oJ01vbmdvREIgQXRsYXMgY29ubmVjdGlvbiBub3RpY2U6JywgZXJyLm1lc3NhZ2UpO1xuICAgICAgICBjYWNoZWQucHJvbWlzZSA9IG51bGw7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIGNhY2hlZC5jb25uID0gYXdhaXQgY2FjaGVkLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjYWNoZWQucHJvbWlzZSA9IG51bGw7XG4gICAgY2FjaGVkLmNvbm4gPSBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGNhY2hlZC5jb25uO1xufVxuXG4vLyBTY2hlbWFzICYgTW9kZWxzXG5jb25zdCBMb2NhdGlvblNjaGVtYSA9IG5ldyBtb25nb29zZS5TY2hlbWEoXG4gIHtcbiAgICBuYW1lQm46IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgIG5hbWVFbjogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlIH0sXG4gICAgZGl2aXNpb246IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgIGRpdmlzaW9uQm46IHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgIGRpc3RyaWN0OiB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IHRydWUgfSxcbiAgICBkaXN0cmljdEJuOiB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IHRydWUgfSxcbiAgICB1cGF6aWxhOiBTdHJpbmcsXG4gICAgdXBhemlsYUJuOiBTdHJpbmcsXG4gICAgc2x1ZzogeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBpbmRleDogdHJ1ZSB9LFxuICAgIGxhdGl0dWRlOiB7IHR5cGU6IE51bWJlciwgcmVxdWlyZWQ6IHRydWUgfSxcbiAgICBsb25naXR1ZGU6IHsgdHlwZTogTnVtYmVyLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgIHN0YXR1czoge1xuICAgICAgdHlwZTogU3RyaW5nLFxuICAgICAgZW51bTogWydhdmFpbGFibGUnLCAndW5hdmFpbGFibGUnLCAnaW5zdWZmaWNpZW50X2RhdGEnLCAnbWl4ZWQnXSxcbiAgICAgIGRlZmF1bHQ6ICdpbnN1ZmZpY2llbnRfZGF0YScsXG4gICAgICBpbmRleDogdHJ1ZSxcbiAgICB9LFxuICAgIHRvdGFsUmVjZW50UmVwb3J0czogeyB0eXBlOiBOdW1iZXIsIGRlZmF1bHQ6IDAgfSxcbiAgICBhdmFpbGFibGVQZXJjZW50YWdlOiB7IHR5cGU6IE51bWJlciwgZGVmYXVsdDogMCB9LFxuICAgIHVuYXZhaWxhYmxlUGVyY2VudGFnZTogeyB0eXBlOiBOdW1iZXIsIGRlZmF1bHQ6IDAgfSxcbiAgICBsYXN0UmVwb3J0QXQ6IHsgdHlwZTogRGF0ZSwgZGVmYXVsdDogbnVsbCB9LFxuICAgIGlzQWN0aXZlOiB7IHR5cGU6IEJvb2xlYW4sIGRlZmF1bHQ6IHRydWUsIGluZGV4OiB0cnVlIH0sXG4gIH0sXG4gIHsgdGltZXN0YW1wczogdHJ1ZSB9XG4pO1xuXG5jb25zdCBSZXBvcnRTY2hlbWEgPSBuZXcgbW9uZ29vc2UuU2NoZW1hKFxuICB7XG4gICAgbG9jYXRpb25JZDogeyB0eXBlOiBtb25nb29zZS5TY2hlbWEuVHlwZXMuTWl4ZWQsIHJlcXVpcmVkOiB0cnVlIH0sXG4gICAgc3RhdHVzOiB7XG4gICAgICB0eXBlOiBTdHJpbmcsXG4gICAgICBlbnVtOiBbJ2F2YWlsYWJsZScsICd1bmF2YWlsYWJsZSddLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICBpbmRleDogdHJ1ZSxcbiAgICB9LFxuICAgIGR1cmF0aW9uOiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJ2p1c3Rfbm93JyB9LFxuICAgIGN1c3RvbU1pbnV0ZXM6IHsgdHlwZTogTnVtYmVyLCBkZWZhdWx0OiBudWxsIH0sXG4gICAgbG9jYWxpdHk6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnJyB9LFxuICAgIGNsaWVudEZpbmdlcnByaW50OiB7IHR5cGU6IFN0cmluZywgZGVmYXVsdDogJycgfSxcbiAgICBzb3VyY2U6IHsgdHlwZTogU3RyaW5nLCBkZWZhdWx0OiAnd2ViJyB9LFxuICAgIGlzRmxhZ2dlZDogeyB0eXBlOiBCb29sZWFuLCBkZWZhdWx0OiBmYWxzZSB9LFxuICAgIGNyZWF0ZWRBdDogeyB0eXBlOiBEYXRlLCBkZWZhdWx0OiBEYXRlLm5vdywgaW5kZXg6IHRydWUgfSxcbiAgfSxcbiAgeyB0aW1lc3RhbXBzOiB7IGNyZWF0ZWRBdDogdHJ1ZSwgdXBkYXRlZEF0OiBmYWxzZSB9IH1cbik7XG5cbmV4cG9ydCBjb25zdCBMb2NhdGlvbk1vZGVsID1cbiAgbW9uZ29vc2UubW9kZWxzLkxvY2F0aW9uIHx8IG1vbmdvb3NlLm1vZGVsKCdMb2NhdGlvbicsIExvY2F0aW9uU2NoZW1hLCAnbG9jYXRpb25zJyk7XG5leHBvcnQgY29uc3QgUmVwb3J0TW9kZWwgPVxuICBtb25nb29zZS5tb2RlbHMuRWxlY3RyaWNpdHlSZXBvcnQgfHxcbiAgbW9uZ29vc2UubW9kZWwoJ0VsZWN0cmljaXR5UmVwb3J0JywgUmVwb3J0U2NoZW1hLCAnZWxlY3RyaWNpdHlyZXBvcnRzJyk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVQsU0FBUyxvQkFBb0I7QUFDcFYsT0FBTyxXQUFXOzs7QUNENlMsT0FBTyxRQUFRO0FBQzlVLE9BQU8sVUFBVTtBQUNqQixPQUFPLFlBQVk7OztBQ0ZrUyxPQUFPLGNBQWM7QUFDMVUsT0FBTyxTQUFTO0FBR2hCLElBQUk7QUFDRixNQUFJLFdBQVcsQ0FBQyxXQUFXLFdBQVcsU0FBUyxDQUFDO0FBQ2xELFNBQVMsR0FBRztBQUFDO0FBRWIsSUFBTSxjQUNKLFFBQVEsSUFBSSxlQUNaO0FBRUYsSUFBSSxTQUFTLE9BQU87QUFDcEIsSUFBSSxDQUFDLFFB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
