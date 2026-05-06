import { type SkillDefinition } from './skillLoader';
export { type SkillDefinition };
export interface AgentCliExtension {
    name: string;
    isActive: boolean;
    skills?: SkillDefinition[];
}
export interface SkillDiscoveryOptions {
    extensions?: AgentCliExtension[];
    isTrusted?: boolean;
    userSkillsDirs?: string[];
    workspaceSkillsDirs?: string[];
    builtinSkillsDir?: string;
}
export declare class SkillManager {
    private skills;
    private activeSkillNames;
    private adminSkillsEnabled;
    /**
     * Clears all discovered skills.
     */
    clearSkills(): void;
    /**
     * Resets session-scoped state (active skill names).
     */
    reset(): void;
    /**
     * Sets administrative settings for skills.
     */
    setAdminSettings(enabled: boolean): void;
    /**
     * Returns true if skills are enabled by the admin.
     */
    isAdminEnabled(): boolean;
    /**
     * Discovers skills from standard user and workspace locations.
     *
     * Precedence: built-in skills (lowest) -> extensions -> user -> workspace
     * (highest). User skills are loaded from `~/.agents/skills`; workspace
     * skills are loaded from the current project's `.agents/skills`.
     */
    discoverSkills(options?: SkillDiscoveryOptions): Promise<void>;
    /**
     * Discovers built-in skills.
     */
    private discoverBuiltinSkills;
    /**
     * Adds skills to the manager programmatically.
     */
    addSkills(skills: SkillDefinition[]): void;
    private addSkillsWithPrecedence;
    /**
     * Returns the list of enabled discovered skills.
     */
    getSkills(): SkillDefinition[];
    /**
     * Returns the list of enabled discovered skills that should be displayed in the UI.
     * This excludes built-in skills.
     */
    getDisplayableSkills(): SkillDefinition[];
    /**
     * Returns all discovered skills, including disabled ones.
     */
    getAllSkills(): SkillDefinition[];
    /**
     * Filters discovered skills by name.
     */
    filterSkills(predicate: (skill: SkillDefinition) => boolean): void;
    /**
     * Sets the list of disabled skill names.
     */
    setDisabledSkills(disabledNames: string[]): void;
    /**
     * Reads the full content (metadata + body) of a skill by name.
     */
    getSkill(name: string): SkillDefinition | null;
    /**
     * Activates a skill by name.
     */
    activateSkill(name: string): void;
    /**
     * Checks if a skill is active.
     */
    isSkillActive(name: string): boolean;
}
