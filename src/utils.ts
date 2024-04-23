import { type Uri, workspace } from "vscode";

export const withExtension = (name: string) => {
	return `biome${process.platform === "win32" ? ".exe" : ""}`;
};

export const fileExists = async (uri: Uri): Promise<boolean> => {
	try {
		await workspace.fs.stat(uri);
		return true;
	} catch (err) {
		return false;
	}
};

export const anyFileExists = async (uris: Uri[]): Promise<boolean> => {
	for (const uri of uris) {
		if (await fileExists(uri)) {
			return true;
		}
	}

	return false;
};
