<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getTalentById, TALENT_TREE, TalentType, type Talent } from '../types/Talent';
import type { Player } from '../types/CombatEntity';
import { getById } from '../utils';
import { ABILITIES, type Ability } from '../types/Ability';
import { EFFECTS } from '../types/Effect';

const props = defineProps<{ player: Player }>();

interface Connection {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    class: "strength" | "agility" | "intelligence";
}

const connections = ref<Connection[]>([]);

function calculateLevels(talents: Talent[]): Talent[][] {
    const talentMap = new Map<string, Talent>();
    const allChildren = new Set<string>();
    const levels: Talent[][] = [];

    // Create talent map and collect all children
    talents.forEach(talent => {
        talentMap.set(talent.id, talent);
        talent.children.forEach(childId => allChildren.add(childId));
    });

    // Find root nodes (talents not present in any children array)
    const roots = talents.filter(talent => !allChildren.has(talent.id));
    const queue = roots.map(root => ({ talent: root, level: 0 }));
    const processedIds = new Set<string>();

    // Process queue using BFS to determine levels
    while (queue.length > 0) {
        const { talent, level } = queue.shift()!;

        // Initialize level array if needed
        if (!levels[level]) levels[level] = [];

        // Add talent to current level
        levels[level].push(talent);
        processedIds.add(talent.id);

        // Add children to queue
        talent.children.forEach(childId => {
            const childTalent = talentMap.get(childId);
            if (childTalent && !processedIds.has(childId)) {
                processedIds.add(childId);
                queue.push({ talent: childTalent, level: level + 1 });
            }
        });
    }

    return levels.filter(Boolean); // Remove empty slots
}

const translateX = ref(0);
const translateY = ref(0);
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);

const startDrag = (event: MouseEvent) => {
    isDragging.value = true;
    startX.value = event.clientX - translateX.value;
    startY.value = event.clientY - translateY.value;

    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
};

const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;

    translateX.value = event.clientX - startX.value;
    translateY.value = event.clientY - startY.value;
};

const stopDrag = () => {
    isDragging.value = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
};

onMounted(() => {
    const wrapper = document.querySelector('.talent-tree__wrapper') as HTMLElement;
    if (wrapper) {
        wrapper.addEventListener('mousedown', startDrag);
    }
    updateConnections();
});

function isTalentLearnable(talent: Talent, branch: Talent[]): boolean {
    if (!props.player.points.talent) return false;

    // Check if it's a talent with level
    if (talent.level && talent.level > 1 && talent.level > props.player.combat.talents[talent.id]) return true;
    
    // Do not mark as learnable if it's already learned.
    if (props.player.combat.talents[talent.id]) return false;

    // Determine if talent is a root by checking if no talent in the branch lists it as a child.
    const isRoot = !branch.some(t => t.children.includes(talent.id));
    if (isRoot) return true;

    // Otherwise, check if any parent talent (one that lists this talent as a child) is learned.
    const parentTalents = branch.filter(t => t.children.includes(talent.id));
    return parentTalents.some(parent => !!props.player.combat.talents[parent.id]);
}

const learnTalent = (talentId: string, levelUp: boolean = false) => {
    if (levelUp && props.player.combat.talents[talentId] === getTalentById(talentId).level) return;
    if (props.player.combat.talents[talentId] && !levelUp) return;

    props.player.combat.talents[talentId] = levelUp ? (props.player.combat.talents[talentId] || 0) + 1 : 1;

    props.player.points.talent -= 1;    

    updateConnections();
};

function updateConnections() {
    connections.value = []; // clear existing connections
    const svgEl = document.querySelector('.talent-tree__lines') as SVGSVGElement;
    if (!svgEl) return;
    const svgRect = svgEl.getBoundingClientRect();

    // Process each branch type
    const branchTypes: Array<keyof typeof TALENT_TREE> = ['strength', 'agility', 'intelligence'];
    branchTypes.forEach(type => {
        const branchTalents = TALENT_TREE[type];
        branchTalents.forEach(parent => {
            parent.children.forEach(childId => {
                const child = branchTalents.find(t => t.id === childId);
                if (!child) return;
                const parentEl = document.getElementById(parent.id);
                const childEl = document.getElementById(child.id);
                if (!parentEl || !childEl) return;

                const parentRect = parentEl.getBoundingClientRect();
                const childRect = childEl.getBoundingClientRect();
                const x1 = parentRect.left - svgRect.left + parentRect.width / 2;
                const y1 = parentRect.top - svgRect.top + parentRect.height / 2;
                const x2 = childRect.left - svgRect.left + childRect.width / 2;
                const y2 = childRect.top - svgRect.top + childRect.height / 2;

                // Determine connection color
                const parentLearned = !!props.player.combat.talents[parent.id];
                const childLearned = !!props.player.combat.talents[child.id];
                const childLearnable = isTalentLearnable(child, branchTalents);

                let color = 'gray'; // default for two not-learned talents
                if (parentLearned && childLearned) {
                    color = 'white';
                } else if (parentLearned && childLearnable) {
                    color = 'gold';
                }

                connections.value.push({ x1, y1, x2, y2, color, class: type });
            });
        });
    });
}

const getTalentData = (talent: Talent) => {
    if (talent.type === TalentType.Ability) {
        const ability = getById(ABILITIES, talent.id) as Ability;

        const description = ability.description.replace(/%(.+?)%/g, (match: string, key: string) => {
            // Handle effect-based formatting
            if (key.startsWith('effect:')) {
                const [_, effectId, type, valueKey] = key.split(':');
                const effect = EFFECTS.find(e => e.id === effectId);
                if (!effect) return match;

                if (type === 'val' && effect.values && effect.values[valueKey]) {
                    const value = effect.values[valueKey](props.player.combat, props.player.combat);
                    return `<span class='value'>${valueKey === 'critChance' ? (value * 100) + '%' : value}</span>`;
                }
                if (type === 'const' && effect.constants && effect.constants[valueKey]) {
                    const value = effect.constants[valueKey];
                    return `<span class='value'>${valueKey === 'critChance' ? (value * 100) + '%' : value}</span>`;
                }
                return match;
            }

            // Handle regular ability values and constants
            const value = (ability.values && ability.values[key] && ability.values[key](props.player.combat)) ||
                         (ability.constants && ability.constants[key]) || 
                         match;
            return `<span class='value'>${key === 'critChance' ? (value * 100) + '%' : value}</span>`;
        });

        return {
            name: ability.name,
            description: description,
            icon: ability.icon
        }
    }

    return {
        name: talent.name,
        description: talent.description,
        icon: talent.icon
    }
}

const resetTalentPoints = () => {
    for (const talent in props.player.combat.talents) {
        const level = props.player.combat.talents[talent];
        props.player.points.talent += level;
        delete props.player.combat.talents[talent];
    }
}
</script>

<template>
    <div class="talent-tree window">
        <div class="window__header">
            <div class="window__name">Talent Tree</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="talent-tree__content window__content">
            <div class="talent-tree__wrapper" :style="{ transform: `translate(${translateX}px, ${translateY}px)` }">
                <svg class="talent-tree__lines">
                    <line
                        v-for="(connection, index) in connections"
                        :key="index"
                        :x1="connection.x1"
                        :y1="connection.y1"
                        :x2="connection.x2"
                        :y2="connection.y2"
                        :stroke="connection.color"
                        :class="connection.class"
                        stroke-width="4"
                    />
                </svg>
                <div v-for="(type, index) in ['strength', 'agility', 'intelligence']" :key="index"
                    class="talent-tree__branch" :class="type">
                    <div v-for="(row, rIndex) in calculateLevels(TALENT_TREE[type as keyof typeof TALENT_TREE])"
                        :key="rIndex" class="talent-tree__row">
                        <div v-for="talent in row" :key="talent.id" :id="talent.id" class="talent"
                            @click="isTalentLearnable(talent, TALENT_TREE[type as keyof typeof TALENT_TREE]) && learnTalent(talent.id, (talent.level && talent.level > 1) || false)"
                            :class="{ 
                                'learned': player.combat.talents[talent.id], 
                                'not-learned': !player.combat.talents[talent.id], 
                                'learnable': isTalentLearnable(talent, TALENT_TREE[type as keyof typeof TALENT_TREE]),
                                'passive': talent.type === TalentType.Passive,
                                'ability': talent.type === TalentType.Ability}">
                            <img :src="`./ability/${getTalentData(talent).icon}`">
                            <div class="talent__tooltip tooltip" @click.stop>
                                <div class="talent__tooltip__header tooltip__header">
                                    <div class="talent__tooltip__name tooltip__name">{{ getTalentData(talent).name }}</div>
                                </div>
                                <div class="talent__tooltip__description" v-html="getTalentData(talent).description"></div>
                            </div>
                            <div class="talent__level" v-if="talent.level">{{ player.combat.talents[talent.id] || 0 }}/{{ talent.level }}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="talent-tree__points">
                <div>Points available: {{ player.points.talent }}</div>
                <button @click="resetTalentPoints">Reset</button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.talent-tree {
    inset: 2em;

    --distance: 4em;

    user-select: none;

    &__points {
        position: absolute;
        display: flex;
        align-items: center;
        gap: .5em;
        padding: .5em;
        bottom: 0;
    }

    &__branch {
        display: grid;
        gap: calc(var(--distance) * 0.866025);
        width: fit-content;

        position: absolute;

        animation: opacityIn .3s ease;

        &.strength,
        &.agility,
        &.intelligence {
            transform-origin: center;
            translate: -24px 64px;

            &:hover {
                z-index: 1;
            }
        }

        &.strength {
            transform: rotate(-61.2deg) translateY(60%);
            --rotate: 61.2deg;
            --clr-attribute: red;

            .talent__tooltip {
                left: 0;
                right: unset;
                translate: -100% -1px;
            }
        }

        &.agility {
            transform: rotate(61.2deg) translateY(60%);
            --rotate: -61.2deg;
            --clr-attribute: lime;
        }

        &.intelligence {
            transform: rotate(180deg) translateY(60%);
            --rotate: 180deg;
            --clr-attribute: blue;
        }
    }

    &__content {
        padding: 0;
        position: relative;
        overflow: hidden;
        height: calc(100% - 2em - 10px);
    }

    &__wrapper {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
    }

    &__row {
        display: flex;
        justify-content: center;
        gap: var(--distance);
    }

    &__lines {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: -1;

        .strength {
            filter: drop-shadow(0 0 16px red);
        }

        .agility {
            filter: drop-shadow(0 0 16px lime);
        }

        .intelligence {
            filter: drop-shadow(0 0 16px blue);
        }
    }

    .talent {
        width: 48px;
        height: 48px;
        cursor: pointer;
        border: 2px solid gray;
        position: relative;

        rotate: var(--rotate);
        // text-rendering: optimizeSpeed;
        // shape-rendering: optimizeSpeed;
        z-index: 1;

        &.passive {
            border-radius: 50%;

            img {                
                border-radius: 50%;
            }

            &:hover {

                &::after {
                    border-radius: 50%;
                }
            }
        }

        &.not-learned {
            img {
                filter: grayscale(1);
            }

            .talent__level {
                color: gray;
            }
        }

        &.learned {
            border-color: white;
        }

        &.learnable {
            border-color: gold;

            img {
                filter: none;
            }
        }

        &:hover {
            border-color: white;

            &::after {
                content: '';
                position: absolute;
                inset: 0;
                box-shadow: inset 0 0 8px 4px rgb(159 139 0 / 50%);
            }

            .talent__tooltip {
                display: grid;
            }
        }

        &__level {
            position: absolute;
            width: 100%;
            text-align: center;
            bottom: -4px;
            translate: 0 100%;
            color: white;
            text-shadow:
                -1px -1px 2px hsl(0, 0%, 20%),
                1px -1px 2px hsl(0, 0%, 20%),
                -1px 1px 2px hsl(0, 0%, 20%),
                1px 1px 2px hsl(0, 0%, 20%);
        }

        &__tooltip {
            display: none;
            right: 0;
            top: 0;
            translate: 100% -1px;
        }

        img {
            width: 100%;
            height: 100%;
            image-rendering: auto;
        }
    }
}
</style>