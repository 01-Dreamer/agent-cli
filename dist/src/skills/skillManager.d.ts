export interface SkillDefinition {
    name: string;
    description: string;
    location: string;
    body: string;
}
export declare class SkillManager {
    private skills;
    addSkills(newSkills: SkillDefinition[]): void;
    getAllSkills(): SkillDefinition[];
    getSkillNames(): string[];
}
