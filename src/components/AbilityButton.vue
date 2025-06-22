<script setup lang="ts">
import type { Ability } from '../types/Ability';
import type { CombatEntity } from '../types/CombatEntity';
import { EFFECTS } from '../types/Effect';

const props = defineProps<{ 
    ability: Ability, 
    player: CombatEntity, 
    enemy: CombatEntity,
    castAbility: (ability: Ability, player: CombatEntity, enemy: CombatEntity) => void
}>();

const formatDescription = (ability: Ability, player: CombatEntity) => {
    return ability.description.replace(/%(.+?)%/g, (match: string, key: string) => {
        // Handle effect-based formatting
        if (key.startsWith('effect:')) {
            const [_, effectId, type, valueKey] = key.split(':');
            const effect = EFFECTS.find(e => e.id === effectId);
            if (!effect) return match;

            if (type === 'val' && effect.values && effect.values[valueKey]) {
                const value = effect.values[valueKey](player, props.enemy || player);
                return `<span class='value'>${valueKey === 'critChance' ? (value * 100) + '%' : value}</span>`;
            }
            if (type === 'const' && effect.constants && effect.constants[valueKey]) {
                const value = effect.constants[valueKey];
                return `<span class='value'>${valueKey === 'critChance' ? (value * 100) + '%' : value}</span>`;
            }
            return match;
        }

        // Handle regular ability values and constants
        const value = (ability.values && ability.values[key] && ability.values[key](player)) ||
                     (ability.constants && ability.constants[key]) || 
                     match;
        return `<span class='value'>${key === 'critChance' ? (value * 100) + '%' : value}</span>`;
    });
};
</script>

<template>
    <div class="ability" :class="{ 'no-mana': player.mana < ability.cost }" 
        :key="ability.name"
        @click="player.mana >= ability.cost && !player.cooldowns[ability.id] && !player.usedActions.includes(ability.id) && castAbility(ability, player, enemy)">
        <img :src="`./ability/${ability.icon}`" />
        <div class="ability__cost" v-if="ability.cost">{{ ability.cost }}</div>
        <div class="ability__tooltip tooltip">
            <div class="ability__tooltip__header tooltip__header">
                <div class="ability__tooltip__name tooltip__name">{{ ability.name }}</div>
                <div class="ability__tooltip__cost" v-if="ability.cost">Cost: {{ ability.cost }}</div>
            </div>
            <div class="ability__tooltip__description" v-html="formatDescription(ability, player)">
            </div>
        </div>
        <div class="ability__cooldown"
            :style="{ '--progress': Math.min(player.cooldowns[ability.id], ability.cooldown) / ability.cooldown }"
            v-if="player.cooldowns[ability.id] && ability.cooldown && !player.usedActions.includes(ability.id)">
            <div class="ability__cooldown__background"></div>
            <div class="ability__cooldown__value">{{ Math.min(player.cooldowns[ability.id],
                ability.cooldown) }}</div>
        </div>
        <div class="ability__cooldown" :style="{ '--progress': 1 }"
            v-if="player.usedActions.includes(ability.id)">
            <div class="ability__cooldown__background"></div>
        </div>
    </div>
</template>

<style lang="scss">
.ability {
    width: 64px;
    height: 64px;
    cursor: pointer;
    border: 4px solid var(--clr-ui-border);
    border-radius: 4px;
    position: relative;

    &::after {
        content: '';
        position: absolute;
        pointer-events: none;
        inset: 0;
    }

    &:hover {
        // border-color: white;

        &::after {
            box-shadow: inset 0 0 8px 4px rgb(159 139 0 / 50%);
        }

        .ability__tooltip {
            display: grid;
        }
    }

    &__cost {
        position: absolute;
        right: 4px;
        bottom: 4px;
        color: var(--clr-mana);
        text-shadow:
            -1px -1px 2px #000,
            1px -1px 2px #000,
            -1px 1px 2px #000,
            1px 1px 2px #000;
    }

    &__tooltip {
        display: none;
        left: 0;
        top: 0;
        translate: -1px -100%;

        &__cost {
            color: var(--clr-mana);
        }
    }

    &.no-mana {
        filter: grayscale(1);
    }

    &__cooldown {
        position: absolute;
        inset: 0;

        &__background {
            background-color: rgba(0, 0, 0, 0.6);
            position: absolute;
            width: 100%;
            height: calc(100% * var(--progress));
            bottom: 0;
            transition: height 0.5s ease;
        }

        &__value {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 1.25em;
            text-shadow:
                -1px -1px 0 #000,
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000;
        }
    }

    img {
        width: 100%;
        height: 100%;
    }
}
</style>