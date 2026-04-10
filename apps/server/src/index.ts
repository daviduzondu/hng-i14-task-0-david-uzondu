import type { ErrorResponse, GenderizeResponse, SuccessResponse } from "@/types";
import { env } from "@hng-i14-task-0-david-uzondu/env/server";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";

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

export class AppError extends Error {
 code: number;
 constructor({ message, code }: {
  message: string,
  code: number
 }) {
  super(message)
  this.code = code;
 }
}

app.get("/api/classify",
 (req: Request, _res: Response, next: NextFunction) => {
  if (req.query.name === undefined) {
   return _res.status(400).json({
    status: "error",
    message: "'name' is required as a query parameter"
   });
  }

  if (req.query.name === "") {
   return _res.status(400).json({
    status: "error",
    message: "'name' cannot be empty"
   });
  }

  if (isNaN(Number(req.query.name)) === false) {
   return _res.status(422).json({
    status: "error",
    message: "'name' must not be a number"
   });
  }
  next()
 },

 async (req: Request<{}, {}, {}, { name: string }>, res: Response<SuccessResponse | ErrorResponse>) => {
  const genderizeResponse = await fetch(`https://api.genderize.io/?name=${req.query.name}`).catch(e => {
   throw new AppError({
    message: e.message,
    code: 502
   })
  });
  if (!genderizeResponse.ok) throw new AppError({
   message: 'Genderize API error',
   code: 502
  });
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


app.use((err: Error, _req: Request, res: Response<ErrorResponse>, _next: NextFunction) => {
 if (err instanceof AppError) {
  return res.status(err.code).json({
   status: 'error',
   message: err.message
  })
 }
 if (err instanceof SyntaxError && 'body' in err) {
  return res.status(400).json({
   status: "error",
   message: err.message
  });
 } else {
  return res.status(500).json({
   status: "error",
   message: "Internal server error"
  })
 }
})

app.listen(env.PORT, () => {
 console.log(`Server is running on http://localhost:${env.PORT}`);
});
