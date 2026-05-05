"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillManager = void 0;
class SkillManager {
    skills = [];
    addSkills(newSkills) {
        for (const skill of newSkills) {
            // Overwrite if same name
            const existingIndex = this.skills.findIndex(s => s.name === skill.name);
            if (existingIndex >= 0) {
                this.skills[existingIndex] = skill;
            }
            else {
                this.skills.push(skill);
            }
        }
    }
    getAllSkills() {
        return this.skills;
    }
    getSkillNames() {
        return this.skills.map(s => s.name);
    }
}
exports.SkillManager = SkillManager;
