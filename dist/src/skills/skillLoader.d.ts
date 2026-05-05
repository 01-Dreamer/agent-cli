export interface SkillDefinition {
    name: string;
    description: string;
    location: string;
    body: string;
}
export declare function loadSkillsFromDir(dirPath: string): Promise<SkillDefinition[]>;
export declare function loadSkillFromFile(filePath: string): Promise<SkillDefinition | null>;
