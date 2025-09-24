import { Express } from "express";
import { registerAuthApi } from "./authorizations";

export function registerLegacyApi(app: Express) {
	registerAuthApi(app);
}
