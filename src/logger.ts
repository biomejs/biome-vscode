import { window } from "vscode";
import { displayName } from "../package.json";

export const logger = window.createOutputChannel(displayName, {
	log: true,
});
