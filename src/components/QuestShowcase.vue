<script setup lang="ts">
import type { Player } from '../types/CombatEntity';
import { QUESTS } from '../types/Quest';
import { ContainerContext } from '../types/Item';
import ItemContainer from './ItemContainer.vue';

const props = defineProps<{ questId: string, player: Player }>();

const quest = QUESTS.find(q => q.id === props.questId);
</script>

<template>
    <div class="quest-showcase">
        <div class="quest-showcase__title">{{ quest?.title }}</div>
        <div class="quest-showcase__objective-list">
            <div v-for="(objective, index) in quest?.objectives" 
                 :key="index" 
                 class="quest-showcase__objective">
                ◼ {{ objective.description.replace('%required%', objective.condition.required.toString()) }}
            </div>
        </div>
        <div class="quest-showcase__rewards">
            <div class="quest-showcase__title">Rewards</div>            
            <div class="quest-showcase__rewards__xp">{{ quest?.xp }} XP</div>
            <ItemContainer 
                v-if="quest?.reward"
                :container="quest.reward" 
                :context="ContainerContext.QuestReward"
                :player="player"
            />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.quest-showcase {
    position: absolute;
    right: 2em;
    bottom: calc(200px + 2em);
    width: calc(4 * (64px + .5em) + 2em);
    padding: 1em;
    border: 1px solid gray;
    background-color: hsla(0, 0%, 0%, 0.5);
    display: grid;
    gap: .5em;

    backdrop-filter: blur(4px);

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
    }

    &__rewards {
        display: grid;
        gap: .5em;
        border-top: 1px solid gray;
        padding-top: .5em;
        margin-top: .5em;

        &__xp {
            color: var(--clr-xp-text);
        }
    }
}
</style>
