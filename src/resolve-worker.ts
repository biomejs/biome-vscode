import { parentPort, workerData } from "node:worker_threads";
import { type ResolverWorkerInput, resolveInCurrentThread } from "./resolver";

/**
 * Entry point of the resolver worker
 *
 * See `resolveInWorker` for why resolution happens here. Errors are thrown
 * as-is and surface as an `error` event on the worker in the extension host.
 */
parentPort?.postMessage(
	resolveInCurrentThread(workerData as ResolverWorkerInput),
);
