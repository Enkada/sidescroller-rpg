<script setup lang="ts">
import { ref } from 'vue';
import { ContainerContext, isEquipment, ItemType, rarityNames, statNames, type Container, type Item, type ItemStats } from '../types/Item';
import type { CombatEntity, Player } from '../types/CombatEntity';
import { percentageValue, playSound } from '../utils';
import { SELL_RATIO } from '../globals';


const props = defineProps<{ item: Item }>();

const selectedItem = ref<string | null>(null);

const formatDescription = (item: Item) => {
    return item.description?.replace(/%(\w+)%/g, (match, p1) => {
        return `<span class="value">${item.constants?.[p1] ?? p1}</span>`;
    });
}

</script>

<template>
    <div class="item-inline" :key="item.uuid" :class="[rarityNames[item.rarity]]"
            >
            <img :src="`./item/${item.icon}`">
            <div class="item-inline__count" v-if="item.isStackable">{{ item.count }}</div>
            <div class="item-inline__name">[{{ item.name }}]</div>
            <div class="item__tooltip tooltip" v-if="item.uuid !== selectedItem">
                <div class="item__tooltip__header tooltip__header">
                    <div class="item__tooltip__name tooltip__name">{{ item.name }}</div>
                </div>
                <div class="item__tooltip__type tooltip__type">{{ item.type[0].toUpperCase() + item.type.slice(1) }}</div>
                <div class="item__tooltip__description" v-if="item.description" v-html="formatDescription(item)"></div>
                <div class="item__tooltip__stat-list" v-if="item.stats" >
                    <div class="item__tooltip__stat" v-for="stat in Object.entries(item.stats)">
                        <span class="value">
                            {{ ['critChance', 'critMultiplier', 'evasion', 'accuracy', 'magicResistance', 'physicalResistance'].includes(stat[0])
                                ? `${(stat[1] * 100)}%` 
                                : `${stat[1] >= 0 ? '+' : '-'} ${stat[1]}` 
                            }}
                        </span> 
                        {{ statNames[stat[0]] }}
                    </div>
                </div>
            <div class="item__tooltip__value gold" v-if="item.value > 0">{{ item.id === 'gold' ? item.count || 1 : percentageValue(item.value * (item.count || 1), SELL_RATIO) }} 🪙</div>
        </div>
    </div>
</template>

<style lang="scss">
.item-inline {
    display: inline-flex;
    gap: .25em;
    width: fit-content;
    position: relative;
    cursor: pointer;

    &__name {
        color: var(--clr);
        translate: 0 5px;
    }

    &:hover {
        .item__tooltip {
            display: grid;
        }
    }

    &__menu {
        display: grid;
        position: absolute;
        left: 0;
        top: 0;
        translate: -100% -1px;
        z-index: 2000;
        background-color: hsla(0, 0%, 0%, 0.8);
        border: 1px solid white;
        width: max-content;

        &__action {
            text-align: center;
            padding: .5em 1em;
            cursor: pointer;

            &:hover {
                background-color: hsla(0, 0%, 100%, 0.3);
            }
        }
    }

    .item__tooltip {
        display: none;
        left: 0;
        top: 0;
        translate: 0 18px;

        &__value {
            text-align: right;
            line-height: 1;
        }
    }

    img {
        width: 20px;
        height: 20px;
        display: block;
        image-rendering: auto;
        border: 1px solid var(--clr);
        translate: 0 3px;
    }
}
</style>