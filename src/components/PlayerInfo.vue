<script setup lang="ts">
import { CRIT_CHANCE_PER_AGI, CRIT_MULT_PER_AGI, DMG_PER_AGI, DMG_PER_STR, HEALTH_PER_STR, MANA_PER_INT, MANA_REGEN_PER_INT } from '../globals';
import type { Attributes, Player } from '../types/CombatEntity';
import { ContainerContext } from '../types/Item';
import { Window } from '../utils';
import ItemContainer from './ItemContainer.vue';
import TextToolTip from './TextToolTip.vue';


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
                <div class="player-info__attribute-value">{{ player.combat.strength }}</div>
                <div class="player-info__attribute-name"><TextToolTip text="Strength">Provides <span class="value">{{ DMG_PER_STR }}</span> attack damage and <span class="value">{{ HEALTH_PER_STR }}</span> health per point</TextToolTip></div>
                <div class="button-list">
                    <button class="button-add" v-if="player.points.attributesAvailable > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('strength', 1)">+</button>
                    <button class="button-cancel"
                        v-if="player.points.attributesAllocated.strength > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('strength', -1)">-</button>
                </div>
                <div class="player-info__attribute-value">{{ player.combat.agility }}</div>
                <div class="player-info__attribute-name"><TextToolTip text="Agility">Provides <span class="value">{{ CRIT_CHANCE_PER_AGI * 100 }}%</span> critical hit chance, <span class="value">{{ CRIT_MULT_PER_AGI * 100 }}%</span> critical hit multiplier per point and <span class="value">1</span> attack damage per {{ 1 / DMG_PER_AGI }} points</TextToolTip></div>
                <div class="button-list">
                    <button class="button-add" v-if="player.points.attributesAvailable > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('agility', 1)">+</button>
                    <button class="button-cancel"
                        v-if="player.points.attributesAllocated.agility > 0 && !combat.isInProgress"
                        @click="allocateAttributePoint('agility', -1)">-</button>
                </div>
                <div class="player-info__attribute-value">{{ player.combat.intelligence }}</div>
                <div class="player-info__attribute-name"><TextToolTip text="Intelligence">Provides <span class="value">{{ MANA_PER_INT }}</span> mana and <span class="value">{{ MANA_REGEN_PER_INT }}</span> mana regeneration per point</TextToolTip></div>
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
                <div class="player-info__stat-value">{{ player.combat.health }} / {{ player.combat.maxHealth }}</div>
                <div class="player-info__stat-name">Mana</div>
                <div class="player-info__stat-value">{{ player.combat.mana }} / {{ player.combat.maxMana }}</div>
                <div class="player-info__stat-name">Mana Regeneration</div>
                <div class="player-info__stat-value">{{ player.combat.manaRegen }}</div>
                <div class="player-info__stat-name">Attack Damage</div>
                <div class="player-info__stat-value">{{ player.combat.attackDamage }}</div>
                <div class="player-info__stat-name">Critical Chance</div>
                <div class="player-info__stat-value">{{ Math.round(player.combat.critChance * 100 * 10) / 10 }}%</div>
                <div class="player-info__stat-name">Critical Multiplier</div>
                <div class="player-info__stat-value">{{ Math.round(player.combat.critMultiplier * 100 * 10) / 10 }}%</div>

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