<script setup lang="ts">
import type { Player } from '../types/CombatEntity';
import { QUESTS, type Quest } from '../types/Quest';
import { ContainerContext } from '../types/Item';
import ItemContainer from './ItemContainer.vue';
import { ref, computed, watch } from 'vue';

const props = defineProps<{ player: Player }>();

const getQuestProgress = (questId: string, objectiveIndex: number) => {
    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) return null;

    const objective = quest.objectives[objectiveIndex];
    const current = objective.condition.current(props.player);
    const required = objective.condition.required;

    return {
        current,
        required,
        isCompleted: current >= required
    };
};

const selectedQuest = ref<Quest | null>(null);

const sortedQuests = computed(() => {
    return Object.keys(props.player.quests)
        .map(questId => QUESTS.find(q => q.id === questId))
        .filter((quest): quest is Quest => quest !== undefined)
        .sort((a, b) => {
            const aCompleted = props.player.quests[a.id];
            const bCompleted = props.player.quests[b.id];
            
            // Sort uncompleted first
            if (aCompleted !== bCompleted) {
                return aCompleted ? 1 : -1;
            }
            
            // For uncompleted quests, sort ready-to-claim first
            if (!aCompleted && !bCompleted) {
                const aReady = a.objectives.every((_, index) => getQuestProgress(a.id, index)?.isCompleted);
                const bReady = b.objectives.every((_, index) => getQuestProgress(b.id, index)?.isCompleted);
                if (aReady !== bReady) {
                    return aReady ? -1 : 1;
                }
            }
            
            return 0;
        });
});

// Watch for changes in sortedQuests to auto-select first uncompleted quest
watch(sortedQuests, (newQuests) => {
    if (newQuests.length > 0) {
        const firstUncompleted = newQuests.find(quest => !props.player.quests[quest.id]);
        if (firstUncompleted) {
            selectedQuest.value = firstUncompleted;
        } else {
            //selectedQuest.value = newQuests[0];
        }
    }
}, { immediate: true });
</script>

<template>
    <div class="quest-log window">
        <div class="window__header">
            <div class="window__name">Quest Log</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="quest-log__content window__content">
            <div v-if="selectedQuest" class="quest-log__quest" :class="{ 'completed': player.quests[selectedQuest.id] }">
                <div class="quest-log__quest__title">{{ player.quests[selectedQuest.id] ? '✓' : '' }} {{ selectedQuest.title }}</div>
                <div class="quest-log__quest__description">{{ selectedQuest.description }}</div>
                <div class="quest-log__quest__objective-list">
                    <div v-for="(objective, index) in selectedQuest.objectives" :key="index" class="quest-log__quest__objective" :class="{ 'completed': getQuestProgress(selectedQuest.id, index)?.isCompleted }">
                        <div class="quest-log__objective__title">◼ {{ objective.description.replace('%required%', objective.condition.required.toString()) }}</div>
                        <div class="quest-log__objective__progress">{{ getQuestProgress(selectedQuest.id, index)?.current }} / {{ getQuestProgress(selectedQuest.id, index)?.required }}</div>
                    </div>
                </div>
                <div class="quest-log__quest__reward">
                    <div class="quest-log__quest__title">Rewards</div>
                    <div class="quest-log__quest__reward__xp">{{ selectedQuest.xp }} XP</div>
                    <ItemContainer :items="selectedQuest.reward.items" :context="ContainerContext.QuestReward" :player="player" :container="selectedQuest.reward"/>
                </div>
            </div>
            <div v-else-if="sortedQuests.length === 0" class="quest-log__empty">No quests available</div>
            <div v-else class="quest-log__empty">Select a quest</div>
            <div class="quest-log__list" v-if="sortedQuests.length > 0">
                <div v-for="quest in sortedQuests" :key="quest.id" 
                    class="quest-log__list__item" 
                    :class="{ 
                        'completed': player.quests[quest.id],
                        'ready-to-claim': !player.quests[quest.id] && quest.objectives.every((_, index) => getQuestProgress(quest.id, index)?.isCompleted),
                        'selected': selectedQuest?.id === quest.id
                    }" 
                    @click="selectedQuest = quest">
                    <div class="quest-log__list__item__title">{{ player.quests[quest.id] ? '✓' : '' }} {{ quest.title }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.quest-log {
    top: 2em;
    left: 2em;
    width: calc(4 * (64px + .5em) + 4em);
    bottom: 2em;

    &__content {
        height: calc(100% - 32px - 8px);
        display: grid;
        grid-template-rows: auto max-content;
        gap: 1em;
    }

    &__empty {
        text-align: center;
        padding: 1em;
    }

    &__quest {
        display: grid;
        align-content: start;
        gap: .5em;

        &.completed {
            & > .quest-log__quest__title {
                color: lime;
            }

            .quest-log__quest__objective {
                color: initial;
            }

            .quest-log__objective__progress {
                display: none;
            }

            .item-container {
                filter: grayscale(100%);
            }
        }

        &__reward {
            display: grid;
            gap: .5em;
            border-top: 4px solid var(--clr-ui-border);
            padding-top: .5em;
            margin-top: .5em;

            &__xp {
                color: var(--clr-xp-text);
            }
        }

        &__title {
            font-size: 22px;
        }

        &__objective-list {
            display: grid;
            gap: .5em;
        }

        &__objective {
            display: grid;
            width: 100%;    
            grid-template-columns: auto max-content;
            align-items: center;
            gap: 1em;

            &.completed {
                color: lime;
            }
        }
    }

    &__list {
        max-height: 200px;
        min-height: 140px;
        display: grid;
        align-content: start;
        border-top: 4px solid var(--clr-ui-border);
        overflow-y: auto;
        background-color: hsla(0, 0%, 0%, 0.5);
        margin: 0 -1em -1em -1em;

        &__item {
            padding: 0.5em;

            &.completed {
                color: gray;
            }

            &.ready-to-claim {
                color: lime;
            }

            &.selected {
                background-color: hsla(0, 0%, 100%, 0.1);
            }

            &:hover {
                background-color: hsla(0, 0%, 100%, 0.1);
            }
        }
    }
}
</style>
