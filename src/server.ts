import "dotenv/config";
import app from './app.js';
import { logger } from "#common/logger.js";

const port = process.env.PORT;

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});