import * as os from 'os';
import * as path from 'path';
import { loadSkillsFromDir, type SkillDefinition } from './skillLoader';

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

export class SkillManager {
    private skills: SkillDefinition[] = [];
    private activeSkillNames: Set<string> = new Set();
    private adminSkillsEnabled = true;

    /**
     * Clears all discovered skills.
     */
    clearSkills(): void {
        this.skills = [];
    }

    /**
     * Resets session-scoped state (active skill names).
     */
    reset(): void {
        this.activeSkillNames.clear();
    }

    /**
     * Sets administrative settings for skills.
     */
    setAdminSettings(enabled: boolean): void {
        this.adminSkillsEnabled = enabled;
    }

    /**
     * Returns true if skills are enabled by the admin.
     */
    isAdminEnabled(): boolean {
        return this.adminSkillsEnabled;
    }

    /**
     * Discovers skills from standard user and workspace locations.
     *
     * Precedence: built-in skills (lowest) -> extensions -> user -> workspace
     * (highest). User skills are loaded from `~/.agents/skills`; workspace
     * skills are loaded from the current project's `.agents/skills`.
     */
    async discoverSkills(options: SkillDiscoveryOptions = {}): Promise<void> {
        this.clearSkills();

        await this.discoverBuiltinSkills(options.builtinSkillsDir);

        for (const extension of options.extensions ?? []) {
            if (extension.isActive && extension.skills) {
                this.addSkillsWithPrecedence(extension.skills);
            }
        }

        for (const dir of options.userSkillsDirs ?? defaultUserSkillsDirs()) {
            this.addSkillsWithPrecedence(await loadSkillsFromDir(dir));
        }

        if (options.isTrusted === false) {
            console.debug('Workspace skills disabled because folder is not trusted.');
            return;
        }

        for (const dir of options.workspaceSkillsDirs ?? defaultWorkspaceSkillsDirs()) {
            this.addSkillsWithPrecedence(await loadSkillsFromDir(dir));
        }
    }

    /**
     * Discovers built-in skills.
     */
    private async discoverBuiltinSkills(builtinSkillsDir?: string): Promise<void> {
        const builtinDir = builtinSkillsDir ?? path.join(__dirname, 'builtin');
        const builtinSkills = await loadSkillsFromDir(builtinDir);

        for (const skill of builtinSkills) {
            skill.isBuiltin = true;
        }

        this.addSkillsWithPrecedence(builtinSkills);
    }

    /**
     * Adds skills to the manager programmatically.
     */
    addSkills(skills: SkillDefinition[]): void {
        this.addSkillsWithPrecedence(skills);
    }

    private addSkillsWithPrecedence(newSkills: SkillDefinition[]): void {
        const skillMap = new Map<string, SkillDefinition>(
            this.skills.map((skill) => [skill.name, skill]),
        );

        for (const newSkill of newSkills) {
            const existingSkill = skillMap.get(newSkill.name);
            if (existingSkill && existingSkill.location !== newSkill.location) {
                if (existingSkill.isBuiltin) {
                    console.warn(
                        `Skill "${newSkill.name}" from "${newSkill.location}" is overriding the built-in skill.`,
                    );
                } else {
                    console.warn(
                        `Skill conflict detected: "${newSkill.name}" from "${newSkill.location}" is overriding the same skill from "${existingSkill.location}".`,
                    );
                }
            }
            skillMap.set(newSkill.name, newSkill);
        }

        this.skills = Array.from(skillMap.values());
    }

    /**
     * Returns the list of enabled discovered skills.
     */
    getSkills(): SkillDefinition[] {
        return this.skills.filter((skill) => !skill.disabled);
    }

    /**
     * Returns the list of enabled discovered skills that should be displayed in the UI.
     * This excludes built-in skills.
     */
    getDisplayableSkills(): SkillDefinition[] {
        return this.skills.filter((skill) => !skill.disabled && !skill.isBuiltin);
    }

    /**
     * Returns all discovered skills, including disabled ones.
     */
    getAllSkills(): SkillDefinition[] {
        return this.skills;
    }

    /**
     * Filters discovered skills by name.
     */
    filterSkills(predicate: (skill: SkillDefinition) => boolean): void {
        this.skills = this.skills.filter(predicate);
    }

    /**
     * Sets the list of disabled skill names.
     */
    setDisabledSkills(disabledNames: string[]): void {
        const lowercaseDisabledNames = disabledNames.map((name) => name.toLowerCase());
        for (const skill of this.skills) {
            skill.disabled = lowercaseDisabledNames.includes(skill.name.toLowerCase());
        }
    }

    /**
     * Reads the full content (metadata + body) of a skill by name.
     */
    getSkill(name: string): SkillDefinition | null {
        const lowercaseName = name.toLowerCase();
        return this.skills.find((skill) => skill.name.toLowerCase() === lowercaseName) ?? null;
    }

    /**
     * Activates a skill by name.
     */
    activateSkill(name: string): void {
        this.activeSkillNames.add(name);
    }

    /**
     * Checks if a skill is active.
     */
    isSkillActive(name: string): boolean {
        return this.activeSkillNames.has(name);
    }
}

function defaultUserSkillsDirs(): string[] {
    const home = os.homedir();
    return [
        path.join(home, '.agents', 'skills'),
    ];
}

function defaultWorkspaceSkillsDirs(): string[] {
    const cwd = process.cwd();
    return [
        path.join(cwd, '.agents', 'skills'),
    ];
}
