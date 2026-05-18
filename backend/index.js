const cors = require("cors");

// CORS configuration
// Allow the production origins and local development origin(s).
// Also allow `null` origin during development (e.g. when opening files via file://)
const allowedOrigins = [
  'https://ssplt10.cloud',
  'https://www.ssplt10.cloud',
  'http://localhost:5173',
  'http://localhost:5175',
  'http://localhost:4173'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or file:// during dev)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Not allowed by CORS'), false);
      }
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true
}));
