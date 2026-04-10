import { classifyNameSchema } from "@/schema";
import type { ErrorResponse, GenderizeResponse, SuccessResponse } from "@/types";
import { env } from "@hng-i14-task-0-david-uzondu/env/server";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import z, { ZodError } from "zod";

const app = express();
app.use(
 cors({
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "OPTIONS"],
 }),
);

app.use(express.json());

app.get("/", (_req, res) => {
 res.status(200).send("OK");
});

class ValidationError extends Error {
 code: number;
 constructor(code: number, error: ZodError) {
  super(error.message, {
   cause: error.cause
  });
  this.code = code;
 }
}
app.get("/api/classify",
 (req: Request, _res: Response, next: NextFunction) => {
  const { success, error } = z.safeParse(classifyNameSchema, req.query);
  if (!success) throw error;
  next()
 },
 async (req: Request<{}, {}, {}, { name: string }>, res: Response<SuccessResponse | ErrorResponse>) => {
  const genderizeResponse = await fetch(`https://api.genderize.io/?name=${req.query.name}`).catch(e => {
   throw new Error("Failed to call Genderize API")
  });
  if (!genderizeResponse.ok) throw new Error("Genderize API error");
  const data: GenderizeResponse = (await genderizeResponse.json()) as GenderizeResponse;
  if (data.count === 0 || data.gender === null) return res.status(404).json({
   status: 'error',
   message: "No prediction available for the provided name"
  });
  return res.status(200)
   .json({
    status: 'success',
    data: {
     gender: data.gender,
     is_confident: data.probability >= 0.70 && data.count >= 100,
     name: data.name,
     probability: data.probability,
     processed_at: new Date().toISOString(),
     sample_size: data.count
    }
   });
 });


app.use((err: Error, _req: Request, _res: Response<ErrorResponse>, _next: NextFunction) => {
 if (err instanceof ZodError) {
  _res.status(400).json({
   "status": "error",
   message: err.message,
  })
 } else if (err instanceof SyntaxError && 'body' in err) {
  return _res.status(400).json({
   status: "error",
   message: err.message
  });
 } else {
  return _res.status(500).json({
   status: "error",
   message: "Internal server error"
  })
 }
})

app.listen(env.PORT, () => {
 console.log(`Server is running on http://localhost:${env.PORT}`);
});
