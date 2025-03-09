<script setup lang="ts">
import type { Attributes, Player } from '../types/CombatEntity';
import { ContainerContext } from '../types/Item';
import { Window } from '../utils';
import ItemContainer from './ItemContainer.vue';


const props = defineProps<{ player: Player, toggleWindow: (window: Window) => void, combat: { isInProgress: boolean }, applyAttributeAllocation: () => void }>();

const allocateAttributePoint = (attribute: keyof Attributes, points: number) => {
    props.player.points.attributesAvailable -= points;
    props.player.points.attributesAllocated[attribute] += points;
    props.player.combat.attributes[attribute] += points;

    props.player.combat.resourcesFix();
}

const cancelAttributeAllocation = () => {
    props.player.points.attributesAvailable += props.player.points.attributesAllocated.agility + props.player.points.attributesAllocated.intelligence + props.player.points.attributesAllocated.strength;

    props.player.combat.attributes.strength -= props.player.points.attributesAllocated.strength;
    props.player.combat.attributes.agility -= props.player.points.attributesAllocated.agility;
    props.player.combat.attributes.intelligence -= props.player.points.attributesAllocated.intelligence;

    props.player.points.attributesAllocated.strength = 0;
    props.player.points.attributesAllocated.agility = 0;
    props.player.points.attributesAllocated.intelligence = 0;

    props.player.combat.resourcesFix();
}
</script>

<template>
    <div class="player-info window">
        <div class="window__header">
            <div class="window__name">Character</div>
            <div class="window__close" @click="toggleWindow(Window.Character)">Close</div>
        </div>
        <div class="player-info__content window__content">
            <div class="player-info__equipment">
                <ItemContainer :container="player.combat.equipment.weapon" :context="ContainerContext.Equipment" :player="player"/>
                <ItemContainer :container="player.combat.equipment.armor" :context="ContainerContext.Equipment" :player="player"/>
                <ItemContainer :container="player.combat.equipment.amulet" :context="ContainerContext.Equipment" :player="player"/>
                <ItemContainer :container="player.combat.equipment.ring" :context="ContainerContext.Equipment" :player="player"/>
            </div>
            <div class="player-info__attribute-list">
                <div class="player-info__attribute-value">{{ player.combat.attributes.strength }}</div>
                <div class="player-info__attribute-name">Strength</div>
                <div class="button-list">
                    <button class="button-add" v-if="player.points.attributesAvailable > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('strength', 1)">+</button>
                    <button class="button-cancel"
                        v-if="player.points.attributesAllocated.strength > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('strength', -1)">-</button>
                </div>
                <div class="player-info__attribute-value">{{ player.combat.attributes.agility }}</div>
                <div class="player-info__attribute-name">Agility</div>
                <div class="button-list">
                    <button class="button-add" v-if="player.points.attributesAvailable > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('agility', 1)">+</button>
                    <button class="button-cancel"
                        v-if="player.points.attributesAllocated.agility > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('agility', -1)">-</button>
                </div>
                <div class="player-info__attribute-value">{{ player.combat.attributes.intelligence }}</div>
                <div class="player-info__attribute-name">Intelligence</div>
                <div class="button-list">
                    <button class="button-add" v-if="player.points.attributesAvailable > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('intelligence', 1)">+</button>
                    <button class="button-cancel"
                        v-if="player.points.attributesAllocated.intelligence > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('intelligence', -1)">-</button>
                </div>
            </div>
            <div class="player-info__attribute-allocation"
                v-if="player.points.attributesAvailable > 0 || Object.values(player.points.attributesAllocated).some(value => value > 0)">
                <div class="player-info__attribute-allocation__text">{{ player.points.attributesAvailable }}
                    point{{
                        player.points.attributesAvailable === 1 ? "" : "s" }} available</div>
                <div class="button-list"
                    v-if="Object.values(player.points.attributesAllocated).some(value => value > 0) && !combat.isInProgress">
                    <button @click="applyAttributeAllocation">Apply</button>
                    <button @click="cancelAttributeAllocation">Cancel</button>
                </div>
            </div>
            <div class="player-info__stat-list">
                <div class="player-info__stat-name">Health</div>
                <div class="player-info__stat-value">{{ player.combat.health }} / {{ player.combat.maxHealth }}
                </div>
                <div class="player-info__stat-name">Mana</div>
                <div class="player-info__stat-value">{{ player.combat.mana }} / {{ player.combat.maxMana }}
                </div>
                <div class="player-info__stat-name">Attack Damage</div>
                <div class="player-info__stat-value">{{ player.combat.attackDamage }}</div>
            </div>
        </div>
    </div>

</template>

<style lang="scss" scoped>
.player-info {
    top: 2em;
    bottom: 2em;
    left: 2em;
    width: fit-content;

    &__equipment {
        display: flex;
        gap: .5em;

        .item-container {
            grid-template-columns: 1fr;
        }
    }

    &__attribute-allocation {
        display: flex;
        align-items: center;
        justify-content: space-between;

        &__text {
            padding-block: .5em;
            border: 1px solid transparent;
        }
    }

    &__attribute-list {
        font-size: 20px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: .5em;

        .button-list {
            display: grid;
            grid-template-columns: 1fr 1fr;

            .button-cancel {
                grid-column: 2;
            }
        }
    }

    &__attribute-value {
        display: grid;
        place-content: center;
        width: 48px;
        height: 48px;
        border: 1px solid gray;
        background-color: hsla(0, 0%, 0%, 0.5);
        border-radius: 50%;
    }

    &__stat-list {
        border: 1px solid gray;
        background-color: hsla(0, 0%, 0%, 0.5);
        display: grid;
        grid-template-columns: 1fr 1fr;

        &>div:nth-child(4n+3),
        &>div:nth-child(4n+4) {
            background-color: hsla(0, 0%, 100%, 0.15);
            /* Replace with your desired color */
        }
    }

    &__stat-name,
    &__stat-value {
        padding: .5em;
    }

    &__stat-value {
        color: lime;
        text-align: right;
    }
}
</style>