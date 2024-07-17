import { Uri } from "vscode";
import { config, fileExists, logger, platform } from "../../utils";
import { LocatorStrategy } from "../strategy";

/**
 * VSCode Settings Strategy
 *
 * The VSCode Settings Strategy is responsible for finding a suitable
 * Biome binary from the user's settings in the VSCode workspace configuration.
 *
 * This strategy supports platform-specific settings, meaning that the user can
 * specify different binaries for different combos of OS, architecture and libc.
 *
 * If the `biome.lsp.bin` setting is specified as a string, the strategy will
 * attempt to locate the binary at the specified path. If the binary is not found
 * at the specified path, the strategy will return `undefined`.
 *
 * If the `biome.lsp.bin` setting is specified as an object, the strategy will
 * attempt to locate the binary at the specified path for the current platform
 * (OS, architecture and libc). If the binary is not found at the specified path,
 * the strategy will return `undefined`. The keys of the object are the OS, architecture
 * and libc combos, concatenated with a dash (`-`), and the values are the paths to
 * the binaries.
 *
 * Example:
 *
 * ```json
 * {
 *   "biome.lsp.bin": {
 *   	"linux-x64": "/path/to/biome",
 *      "linux-arm64-musl": "/path/to/biome",
 *      "darwin-arm64": "/path/to/biome",
 *      "win32-x64": "/path/to/biome.exe"
 *   }
 * }
 * ```
 *
 * General VS Code settings overriding rules apply.
 */
export class VSCodeSettingsStrategy extends LocatorStrategy {
	async find(): Promise<Uri | undefined> {
		const bin = config<string | Record<string, string>>("lsp.bin", {
			default: "",
			scope: this.context,
		});

		if (typeof bin === "string") {
			return this.findBinary(bin);
		}

		if (typeof bin === "object" && bin !== null) {
			return this.findPlatformSpecificBinary(bin);
		}

		return undefined;
	}

	/**
	 * Find the binary
	 *
	 * This method attempt to find the binary from the given path. If the binary
	 * is not found, it will return `undefined`.
	 */
	private findBinary(bin: string): Uri | undefined {
		if (bin === "") {
			return undefined;
		}

		const biome = Uri.file(bin);

		if (fileExists(biome)) {
			return biome;
		}

		return undefined;
	}

	/**
	 * Find the platform-specific binary
	 *
	 * This method attempt to find the platform-specific binary from the given
	 * configuration object. If the binary is not found, it will return `undefined`.
	 */
	private findPlatformSpecificBinary(
		bin: Record<string, string>,
	): Uri | undefined {
		if (platform in bin) {
			return this.findBinary(bin[platform]);
		}

		return undefined;
	}
}
