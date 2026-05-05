export interface SkillDefinition {
    name: string;
    description: string;
    location: string;
    body: string;
}

export class SkillManager {
    private skills: SkillDefinition[] = [];

    addSkills(newSkills: SkillDefinition[]) {
        for (const skill of newSkills) {
            // Overwrite if same name
            const existingIndex = this.skills.findIndex(s => s.name === skill.name);
            if (existingIndex >= 0) {
                this.skills[existingIndex] = skill;
            } else {
                this.skills.push(skill);
            }
        }
    }

    getAllSkills(): SkillDefinition[] {
        return this.skills;
    }

    getSkillNames(): string[] {
        return this.skills.map(s => s.name);
    }
}
