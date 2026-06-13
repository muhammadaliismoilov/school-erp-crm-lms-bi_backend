import { registerAs } from "@nestjs/config";

export default registerAs("database", () => ({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number.parseInt(process.env.DATABASE_PORT ?? "5432", 10),
  username: process.env.DATABASE_USER ?? "yuton",
  password: process.env.DATABASE_PASSWORD ?? "yuton",
  name: process.env.DATABASE_NAME ?? "yuton_school",
  ssl: process.env.DATABASE_SSL === "true",
  logging: process.env.TYPEORM_LOGGING === "true",
  synchronize: process.env.TYPEORM_SYNCHRONIZE === "true",
  replica: {
    host: process.env.DATABASE_REPLICA_HOST,
    port: Number.parseInt(process.env.DATABASE_REPLICA_PORT ?? process.env.DATABASE_PORT ?? "5432", 10),
    username: process.env.DATABASE_REPLICA_USER,
    password: process.env.DATABASE_REPLICA_PASSWORD,
    name: process.env.DATABASE_REPLICA_NAME,
  },
}));
