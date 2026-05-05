export declare function getWorkspaceDir(): string;
export declare function resolveWorkspacePath(inputPath?: string): {
    absolutePath: string;
    workspaceDir: string;
    error?: string;
};
export declare function toPosixPath(filePath: string): string;
export declare function globToRegExp(pattern: string): RegExp;
export declare function matchesAnyGlob(relativePath: string, patterns?: string[]): boolean;
export declare function walkFiles(rootDir: string, options?: {
    ignoreDirs?: string[];
}): Promise<string[]>;
