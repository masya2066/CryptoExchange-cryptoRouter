import express from 'express';
import cors from 'cors';
import { InitApi } from './handlers/crypto.js';

const app = express();

// Middleware to log all requests
app.use((req, res, next) => {
  const logDetails = `${new Date().toISOString()} ${req.method} ${req.url}`;
  console.log(logDetails);
  next(); // Pass control to the next middleware
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Allow requests from any origin with specific methods
app.use(cors({
    origin: '*', // Allow all origins
    methods: 'GET,POST,PUT,DELETE,PATCH', // Allowed methods
}));

// Initialize your API routes
InitApi(app);

const port = 1122;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});