import { workspace } from "vscode";
import { config } from "./utils";

/**
 * Migrates configuration settings from a previous version of the extension
 *
 * This function migrates configuration settings from a previous version of the
 * extension to the current version. It is called when the extension is
 * activated for the first time, and should be used to migrate any settings that
 * have been changed or removed in a previous version.
 *
 * Upon migration, the old settings will be removed from the configuration.
 */
export const migrateConfigurationSettings = async () => {
	migrateBiomeLspBin();
	migrateTraceServer();
	migrateBiomeRename();
};

/**
 * Migrates the `biome.lspBin` setting to the new `biome.lsp.bin` setting.
 */
const migrateBiomeLspBin = () => {
	const lspBin = config<string>("lspBin", { default: undefined });

	if (lspBin) {
		workspace.getConfiguration("biome").update("lsp.bin", lspBin, true);
		workspace.getConfiguration("biome").update("lspBin", undefined, true);
	}
};

const migrateTraceServer = () => {
	const traceServer = workspace
		.getConfiguration("biome_lsp")
		.get<string>("trace.server");

	if (traceServer) {
		workspace
			.getConfiguration("biome")
			.update("lsp.trace.server", traceServer, true);
		workspace
			.getConfiguration("biome_lsp")
			.update("trace.server", undefined, true);
	}
};

const migrateBiomeRename = () => {
	const biomeRename = workspace
		.getConfiguration("biome")
		.get<string>("rename");

	if (biomeRename) {
		workspace
			.getConfiguration("biome")
			.update("experimental.rename", biomeRename, true);
		workspace.getConfiguration("biome").update("rename", undefined, true);
	}
};
