import { ref } from 'vue';
import type { Container } from './Item';
import type { Quest } from './Quest';

export interface ScriptMenuItem {
    label: string;
    title: string;
}

export enum DialogueType {
    Shop,
    Talk,
    QuestAccept,
    QuestComplete
}

export type DialogueOption = {
    type: DialogueType

    // DialogueType.Shop
    shop?: Container

    // DialogueType.Talk
    text?: string

    // DialogueType.Talk, DialogueType.QuestAccept, DialogueType.QuestComplete
    script?: string
    isUnique?: boolean

    // DialogueType.QuestAccept, DialogueType.QuestComplete
    quest?: Quest
}

// Script state refs
export const script = ref('');
export const scriptIndex = ref(-1);
export const scriptActor = ref('');
export const scriptMessage = ref('');
export const scriptMenu = ref<ScriptMenuItem[]>([]);

// Helper function to parse script arguments
export function parseArguments(str: string) {
    const regex = /[^\s"]+|"([^"]*)"/gi;
    const args = [];
    let match;

    do {
        match = regex.exec(str);
        if (match != null) {
            args.push(match[1] ? match[1] : match[0]);
        }
    } while (match !== null);

    return args;
}

// Helper function to get script lines
export function getScriptLines() {
    function wrapSpreadedJSON(script: string) {
        const spreadedJSONRegex = /menu\s*\[\s*([\s\S]+?)\s*\]/g;
        return script.replace(spreadedJSONRegex, (_: string, json: string) => {
            const wrappedJSON = json.replace(/\n\s*/g, '');
            return `menu "[${wrappedJSON.replace(/'/g, '&apos;').replace(/\"/g, "'").replace(/\r/g, '')}]"`;
        });
    }

    return wrapSpreadedJSON(script.value)
        .replace(/\/\/.*/g, '')
        .replace(/\n\s*\n/g, '\n')
        .split('\n');
} 