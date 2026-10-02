import "dotenv/config";
import { buildApp } from "./app";

const start = async (): Promise<void> => {
  const app = await buildApp();
  const port = Number(process.env.PORT || 3000);

  try {
    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
