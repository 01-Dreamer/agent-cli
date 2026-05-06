"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillManager = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const skillLoader_1 = require("./skillLoader");
class SkillManager {
    skills = [];
    activeSkillNames = new Set();
    adminSkillsEnabled = true;
    /**
     * Clears all discovered skills.
     */
    clearSkills() {
        this.skills = [];
    }
    /**
     * Resets session-scoped state (active skill names).
     */
    reset() {
        this.activeSkillNames.clear();
    }
    /**
     * Sets administrative settings for skills.
     */
    setAdminSettings(enabled) {
        this.adminSkillsEnabled = enabled;
    }
    /**
     * Returns true if skills are enabled by the admin.
     */
    isAdminEnabled() {
        return this.adminSkillsEnabled;
    }
    /**
     * Discovers skills from standard user and workspace locations.
     *
     * Precedence: built-in skills (lowest) -> extensions -> user -> workspace
     * (highest). User skills are loaded from `~/.agents/skills`; workspace
     * skills are loaded from the current project's `.agents/skills`.
     */
    async discoverSkills(options = {}) {
        this.clearSkills();
        await this.discoverBuiltinSkills(options.builtinSkillsDir);
        for (const extension of options.extensions ?? []) {
            if (extension.isActive && extension.skills) {
                this.addSkillsWithPrecedence(extension.skills);
            }
        }
        for (const dir of options.userSkillsDirs ?? defaultUserSkillsDirs()) {
            this.addSkillsWithPrecedence(await (0, skillLoader_1.loadSkillsFromDir)(dir));
        }
        if (options.isTrusted === false) {
            console.debug('Workspace skills disabled because folder is not trusted.');
            return;
        }
        for (const dir of options.workspaceSkillsDirs ?? defaultWorkspaceSkillsDirs()) {
            this.addSkillsWithPrecedence(await (0, skillLoader_1.loadSkillsFromDir)(dir));
        }
    }
    /**
     * Discovers built-in skills.
     */
    async discoverBuiltinSkills(builtinSkillsDir) {
        const builtinDir = builtinSkillsDir ?? path.join(__dirname, 'builtin');
        const builtinSkills = await (0, skillLoader_1.loadSkillsFromDir)(builtinDir);
        for (const skill of builtinSkills) {
            skill.isBuiltin = true;
        }
        this.addSkillsWithPrecedence(builtinSkills);
    }
    /**
     * Adds skills to the manager programmatically.
     */
    addSkills(skills) {
        this.addSkillsWithPrecedence(skills);
    }
    addSkillsWithPrecedence(newSkills) {
        const skillMap = new Map(this.skills.map((skill) => [skill.name, skill]));
        for (const newSkill of newSkills) {
            const existingSkill = skillMap.get(newSkill.name);
            if (existingSkill && existingSkill.location !== newSkill.location) {
                if (existingSkill.isBuiltin) {
                    console.warn(`Skill "${newSkill.name}" from "${newSkill.location}" is overriding the built-in skill.`);
                }
                else {
                    console.warn(`Skill conflict detected: "${newSkill.name}" from "${newSkill.location}" is overriding the same skill from "${existingSkill.location}".`);
                }
            }
            skillMap.set(newSkill.name, newSkill);
        }
        this.skills = Array.from(skillMap.values());
    }
    /**
     * Returns the list of enabled discovered skills.
     */
    getSkills() {
        return this.skills.filter((skill) => !skill.disabled);
    }
    /**
     * Returns the list of enabled discovered skills that should be displayed in the UI.
     * This excludes built-in skills.
     */
    getDisplayableSkills() {
        return this.skills.filter((skill) => !skill.disabled && !skill.isBuiltin);
    }
    /**
     * Returns all discovered skills, including disabled ones.
     */
    getAllSkills() {
        return this.skills;
    }
    /**
     * Filters discovered skills by name.
     */
    filterSkills(predicate) {
        this.skills = this.skills.filter(predicate);
    }
    /**
     * Sets the list of disabled skill names.
     */
    setDisabledSkills(disabledNames) {
        const lowercaseDisabledNames = disabledNames.map((name) => name.toLowerCase());
        for (const skill of this.skills) {
            skill.disabled = lowercaseDisabledNames.includes(skill.name.toLowerCase());
        }
    }
    /**
     * Reads the full content (metadata + body) of a skill by name.
     */
    getSkill(name) {
        const lowercaseName = name.toLowerCase();
        return this.skills.find((skill) => skill.name.toLowerCase() === lowercaseName) ?? null;
    }
    /**
     * Activates a skill by name.
     */
    activateSkill(name) {
        this.activeSkillNames.add(name);
    }
    /**
     * Checks if a skill is active.
     */
    isSkillActive(name) {
        return this.activeSkillNames.has(name);
    }
}
exports.SkillManager = SkillManager;
function defaultUserSkillsDirs() {
    const home = os.homedir();
    return [
        path.join(home, '.agents', 'skills'),
    ];
}
function defaultWorkspaceSkillsDirs() {
    const cwd = process.cwd();
    return [
        path.join(cwd, '.agents', 'skills'),
    ];
}
