import { ServiceError } from "@grpc/grpc-js";

export type Callback<T> = (
  error: ServiceError | null,
  response: T | null
) => void;
