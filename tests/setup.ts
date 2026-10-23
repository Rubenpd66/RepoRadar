import "dotenv/config";
if (
  !process.env.TEST_DATABASE_URL ||
  !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error(
    "TEST_DATABASE_URL debe apuntar a una base aislada con sufijo _test",
  );
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
