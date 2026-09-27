import dotenv from "dotenv";

// Load environment variables safely
dotenv.config();

export interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  awsRegion?: string;
  s3Bucket?: string;
  dynamoDbTable?: string;
  bedrockModelId?: string;
  corsOrigin: string;
}

export function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV || "development") as AppConfig["nodeEnv"];
  const port = parseInt(process.env.PORT || "3001", 10);
  const corsOrigin = process.env.CORS_ORIGIN || "*";

  return {
    nodeEnv,
    port: isNaN(port) ? 3001 : port,
    awsRegion: process.env.AWS_REGION || "us-east-1",
    s3Bucket: process.env.S3_BUCKET || "epistemic-engine-documents-dev",
    dynamoDbTable: process.env.DYNAMODB_TABLE || "epistemic-engine-dev",
    bedrockModelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0",
    corsOrigin,
  };
}

export const config = loadConfig();

