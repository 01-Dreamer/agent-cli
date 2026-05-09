import { Tool } from './tool';
import { SkillManager } from '../skills/skillManager';
export interface ActivateSkillArgs {
    name: string;
}
export declare class ActivateSkillTool extends Tool<ActivateSkillArgs> {
    private readonly skillManager;
    readonly name = "activate_skill";
    readonly description = "ActivateSkill: Activates a discovered skill and returns its detailed instructions and available resources.";
    readonly parameters: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    constructor(skillManager: SkillManager);
    execute(args: ActivateSkillArgs): Promise<string>;
}
