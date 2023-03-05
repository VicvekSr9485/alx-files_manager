import express from 'express';
import router from './routes';

const port = process.env.PORT || 5000;

const app = express();

// Enable JSON parsing middleware
app.use(express.json());
// Use the router for handling requests
app.use(router);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
