/**
 * Represents the definition of an Agent Skill.
 */
export interface SkillDefinition {
    /** The unique name of the skill. */
    name: string;
    /** A concise description of what the skill does. */
    description: string;
    /** The absolute path to the skill's source file on disk. */
    location: string;
    /** The core logic/instructions of the skill. */
    body: string;
    /** Whether the skill is currently disabled. */
    disabled?: boolean;
    /** Whether the skill is a built-in skill. */
    isBuiltin?: boolean;
    /** The name of the extension that provided this skill, if any. */
    extensionName?: string;
}
export declare const FRONTMATTER_REGEX: RegExp;
/**
 * Parses frontmatter content using a small YAML-compatible parser.
 *
 * This parser supports the skill fields agent-cli currently uses:
 * `name` and `description`, including indented fields, quoted values,
 * missing spaces after colons, and multi-line descriptions.
 */
export declare function parseFrontmatter(content: string): {
    name: string;
    description: string;
} | null;
/**
 * Discovers and loads all skills in the provided directory.
 */
export declare function loadSkillsFromDir(dir: string): Promise<SkillDefinition[]>;
/**
 * Loads a single skill from a SKILL.md file.
 */
export declare function loadSkillFromFile(filePath: string): Promise<SkillDefinition | null>;
