<script setup lang="ts">
import { ref } from 'vue';
import { ContainerContext, isEquipment, ItemType, statNames, type Container, type Item, type ItemStats } from '../types/Item';
import type { Player } from '../types/CombatEntity';
import { percentageValue } from '../utils';
import { SELL_RATIO } from '../globals';


const props = defineProps<{ container: Container, context: ContainerContext, player: Player, shopContainer?: Container }>();

const selectedItem = ref<string | null>(null);

const destroyItem = (item: Item) => {
    props.container.remove(item);
}

const equipItem = (item: Item) => {
    const equipmentContainer = props.player.combat.equipment[item.type as keyof typeof props.player.combat.equipment];
    
    if (equipmentContainer.length === 1) {
        const equippedItem = equipmentContainer.items[0];
        // Capture the original index of the item in the inventory before moving it
        const originalIndex = props.container.items.findIndex(x => x.uuid === item.uuid);
        equipmentContainer.remove(equippedItem);
        props.container.move(item, equipmentContainer);
        // Insert the equipped item into the original container at the original index
        props.container.add(equippedItem, originalIndex);
    } else {
        props.container.move(item, equipmentContainer);
    }

    selectedItem.value = null;
}

const unequipItem = (item: Item) => {
    props.container.move(item, props.player.inventory);
    selectedItem.value = null;
    props.player.combat.resourcesFix();
}

const doubleClick = (item: Item) => {
    if (props.context === ContainerContext.Equipment) {
        unequipItem(item);
    }
    else if (props.context === ContainerContext.Loot) {
        takeItem(item);
    }
    else if (props.context === ContainerContext.Shop) {
        buyItem(item);
    }
    else if (props.shopContainer && props.context === ContainerContext.Inventory) {
        sellItem(item);
    }
    else if (props.context === ContainerContext.Inventory && isEquipment(item)) {
        equipItem(item);
    }
}

const buyItem = (item: Item) => {
    if (props.player.gold >= item.value) {
        if (props.player.inventory.add(item)) {
            props.player.gold -= item.value;
        }
    }
}

const sellItem = (item: Item) => {
    props.container.remove(item);
    props.player.gold += percentageValue(item.value * (item.count || 1), SELL_RATIO);
}

const sellOneItem = (item: Item) => {
    if (item.count && item.count > 1 && item.isStackable) {
        item.count -= 1;
        props.player.gold += percentageValue(item.value, SELL_RATIO);
    }
}

const takeItem = (item: Item) => {
    if (item.id === 'gold') {
        props.player.gold += item.count || 1;
        props.container.remove(item);
    }
    else {
        props.container.move(item, props.player.inventory);
    }
}
</script>

<template>
    <div class="item-container" :class="context">
        <div class="item" v-for="item in container.items" :key="item.uuid" :class="item.rarity"
            @mouseleave="selectedItem = null">
            <img :src="`./item/${item.icon}`" @contextmenu.prevent="selectedItem = item.uuid || null" @dblclick="doubleClick(item)">
            <div class="item__count" v-if="item.isStackable">{{ item.count }}</div>
            <div class="item__menu" v-if="item.uuid === selectedItem">
                <div class="item__menu__action" v-if="item.type === ItemType.Consumable && context === ContainerContext.Inventory">Use</div>
                <div class="item__menu__action" v-if="isEquipment(item) && context === ContainerContext.Inventory"
                    @click="equipItem(item)">Equip</div>
                <div class="item__menu__action" v-if="context === ContainerContext.Equipment" @click="unequipItem(item)">Unequip</div>
                <div class="item__menu__action" v-if="context === ContainerContext.Loot" @click="takeItem(item)">Take</div>
                <div class="item__menu__action" v-if="[ContainerContext.Inventory, ContainerContext.Equipment].includes(context) && !shopContainer" @click="destroyItem(item)">Destroy</div>
                <div class="item__menu__action" v-if="context === ContainerContext.Shop" @click="buyItem(item)">Buy</div>
                <div class="item__menu__action" v-if="shopContainer && context !== ContainerContext.Shop" @click="sellItem(item)">Sell {{ item.isStackable && (item.count || 0) > 1 ? 'All' : '' }}</div>
                <div class="item__menu__action" v-if="shopContainer && context !== ContainerContext.Shop && item.isStackable && (item.count || 0) > 1" @click="sellOneItem(item)">Sell 1</div>
            </div>
            <div class="item__tooltip tooltip" v-if="item.uuid !== selectedItem">
                <div class="item__tooltip__header tooltip__header">
                    <div class="item__tooltip__name tooltip__name">{{ item.name }}</div>
                </div>
                <div class="item__tooltip__description" v-if="item.description">{{ item.description }}</div>
                <div class="item__tooltip__stat-list" v-if="item.stats" >
                    <div class="item__tooltip__stat" v-for="stat in Object.entries(item.stats)"><span class="value">{{ stat[1] >= 0 ? '+' : '-' }} {{ stat[1] }}</span> {{ statNames[stat[0]] }}</div>
                </div>
                <div class="item__tooltip__value gold">{{ context === ContainerContext.Shop || item.id === 'gold' ? item.value * (item.count || 1) : percentageValue(item.value * (item.count || 1), SELL_RATIO) }} 🪙</div>
            </div>
        </div>
        <div class="item empty" v-for="_ in container.size - container.items.length">
            <div class="item__empty-bg">
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.item-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    align-content: start;
    gap: .5em;

    &.equipment {
        .item__tooltip {
            left: unset;
            right: 0;
            top: 0;
            translate: 100% -1px;
        }

        .item__menu {
            left: unset;
            right: 0;
            top: 0;
            translate: 100% -1px;
        }
    }
}

.item {
    width: 64px;
    height: 64px;
    border-width: 1px;
    border-style: solid;
    border-color: var(--clr);
    position: relative;

    &__empty-bg {
        width: 100%;
        height: 100%;
        background-color: hsla(0, 0%, 0%, 0.5);
    }

    &__count {
        position: absolute;
        right: 4px;
        bottom: 4px;
        color: white;
        text-shadow:
            -1px -1px 2px #000,
            1px -1px 2px #000,
            -1px 1px 2px #000,
            1px 1px 2px #000;
    }

    &.empty {
        border-color: gray;
    }

    &:hover {
        &::after {
            content: '';
            position: absolute;
            pointer-events: none;
            inset: 0;
            box-shadow: inset 0 0 8px 4px rgb(159 139 0 / 50%);
        }

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

    &__tooltip {
        display: none;
        left: 0;
        bottom: 0;
        translate: -100% 1px;

        &__value {
            text-align: right;
            line-height: 1;
        }
    }

    img {
        width: 100%;
        height: 100%;
        cursor: pointer;
    }
}
</style>