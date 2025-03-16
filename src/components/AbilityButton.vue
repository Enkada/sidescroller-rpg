<script setup lang="ts">
import type { Ability } from '../types/Ability';
import type { CombatEntity } from '../types/CombatEntity';

const props = defineProps<{ 
    ability: Ability, 
    player: CombatEntity, 
    enemy: CombatEntity,
    castAbility: (ability: Ability, player: CombatEntity, enemy: CombatEntity) => void
}>();
</script>

<template>
    <div class="ability" :class="{ 'no-mana': player.mana < ability.cost }" 
        :key="ability.name"
        @click="player.mana >= ability.cost && !player.cooldowns[ability.id] && !player.usedAbilities.includes(ability.id) && castAbility(ability, player, enemy)">
        <img :src="`./ability/${ability.icon}`" />
        <div class="ability__cost" v-if="ability.cost">{{ ability.cost }}</div>
        <div class="ability__tooltip tooltip">
            <div class="ability__tooltip__header tooltip__header">
                <div class="ability__tooltip__name tooltip__name">{{ ability.name }}</div>
                <div class="ability__tooltip__cost" v-if="ability.cost">Cost: {{ ability.cost }}</div>
            </div>
            <div class="ability__tooltip__description" v-html="ability.description.replace(/%(.+?)%/g, (match, key) => `<span class='value'>
                ${ability.values && ability.values[key] && ability.values[key](player) ||
                ability.constants && ability.constants[key] || match}
                </span>`)">
            </div>
        </div>
        <div class="ability__cooldown"
            :style="{ '--progress': Math.min(player.cooldowns[ability.id], ability.cooldown) / ability.cooldown }"
            v-if="player.cooldowns[ability.id] && ability.cooldown && !player.usedAbilities.includes(ability.id)">
            <div class="ability__cooldown__background"></div>
            <div class="ability__cooldown__value">{{ Math.min(player.cooldowns[ability.id],
                ability.cooldown) }}</div>
        </div>
        <div class="ability__cooldown" :style="{ '--progress': 1 }"
            v-if="player.usedAbilities.includes(ability.id)">
            <div class="ability__cooldown__background"></div>
        </div>
    </div>
</template>

<style lang="scss">
.ability {
    width: 64px;
    height: 64px;
    cursor: pointer;
    border: 1px solid gray;
    position: relative;

    &:hover {
        border-color: white;

        &::after {
            content: '';
            position: absolute;
            inset: 0;
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