<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Player } from '../types/CombatEntity';
import { CombatEntity } from '../types/CombatEntity';
import { Container, ContainerContext, ITEMS, createItem, type Item, type LootTable, GLOBAL_LOOT_TABLE } from '../types/Item';
import ItemContainer from './ItemContainer.vue';
import { ABILITIES, type Ability } from '../types/Ability';
import AbilityButton from './AbilityButton.vue';
import ItemInline from './ItemInline.vue';
import type { Screen } from '../utils';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { DialogueType } from '../types/Script';

const props = defineProps<{
    player: Player,
    screens: Screen[],
    enemies?: Record<string, {
        lootTable: LootTable
        combat: (level: number) => CombatEntity
    }>
}>();

const activeTab = ref('items');
const shopContainer = ref(Container.create(ITEMS.length));
const selectedJsonObject = ref('player');

// Computed property to get the selected JSON data to display
const jsonData = computed(() => {
    switch (selectedJsonObject.value) {
        case 'player':
            return props.player;
        case 'screens':
            return props.screens;
        case 'enemies':
            return props.enemies || {};
        default:
            return {};
    }
});

// Dummy empty enemy for abilities preview
const dummyEnemy = ref(CombatEntity.create(
    "target_dummy",
    "Target Dummy",
    1,
    { intelligence: 10, strength: 10, agility: 10 },
    "fly", // Using a basic sprite
    { id: "hit", volume: 1, variations: 1 }
));

const castAbility = (ability: Ability, caster: CombatEntity, target: CombatEntity) => {
    // This is just a placeholder function that does nothing
    console.log(`${ability.name} would be cast from ${caster.name} to ${target.name}`);
};

// Function to check for item warnings
const getItemWarnings = computed(() => {
    const warnings: { item: Item, reason: string }[] = [];
    const lootTableItems = new Set<string>();
    
    // Add all items from GLOBAL_LOOT_TABLE to the set
    GLOBAL_LOOT_TABLE.forEach(loot => lootTableItems.add(loot.item));
    
    // Add all items from enemy loot tables
    if (props.enemies) {
        Object.values(props.enemies).forEach(enemy => {
            enemy.lootTable.forEach((loot) => lootTableItems.add(loot.item));
        });
    }
    
    // Scan all screens for quest rewards and shop items
    if (props.screens) {
        props.screens.forEach(screen => {
            if (screen.objects) {
                screen.objects.forEach(obj => {
                    if (obj.dialogue) {
                        obj.dialogue.forEach(dialogueOption => {
                            // Check quest rewards
                            if ((dialogueOption.type === DialogueType.QuestAccept || dialogueOption.type === DialogueType.QuestComplete) && 
                                dialogueOption.quest?.reward?.items) {
                                dialogueOption.quest.reward.items.forEach(item => {
                                    if (item.id) lootTableItems.add(item.id);
                                });
                            }
                            
                            // Check shop items
                            if (dialogueOption.type === DialogueType.Shop && dialogueOption.shop?.items) {
                                dialogueOption.shop.items.forEach(item => {
                                    if (item.id) lootTableItems.add(item.id);
                                });
                            }
                        });
                    }
                });
            }
        });
    }
    
    // Check each item for issues
    ITEMS.forEach(item => {
        // Skip armor items as requested
        if (item.type === 'armor') return;
        
        // Check for missing value
        if (item.value <= 0) {
            warnings.push({ item, reason: "Missing sell price 🪙" });
        }
        
        // Check if item is not obtainable
        if (!lootTableItems.has(item.id)) {
            warnings.push({ item, reason: "Not obtainable 💰" });
        }
    });
    
    return warnings;
});

onMounted(() => {
    ITEMS.forEach(item => {
        shopContainer.value.add(createItem(item.id));
    });
});
</script>

<template>
    <div class="window dev-tools">
        <div class="window__header">
            <div class="window__name">Developer Tools</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="window__content">
            <div class="window__tab-list">
                <div class="window__tab-list__item" :class="{ active: activeTab === 'items' }"
                    @click="activeTab = 'items'">Items</div>
                <div class="window__tab-list__item" :class="{ active: activeTab === 'skills' }"
                    @click="activeTab = 'skills'">Skills</div>
                <div class="window__tab-list__item" :class="{ active: activeTab === 'variables' }"
                    @click="activeTab = 'variables'">Variables</div>
                <div class="window__tab-list__item" :class="{ active: activeTab === 'json' }"
                    @click="activeTab = 'json'">JSON</div>
            </div>            
            <div class="window__tab items" v-if="activeTab === 'items'">
                <ItemContainer :container="shopContainer" :context="ContainerContext.Shop" :player="player"/>
                <div class="item-warning-list">
                    <div class="item-warning" v-for="warning in getItemWarnings" :key="warning.item.id">
                        <ItemInline :item="warning.item" />
                        <span class="warning-reason">{{ warning.reason }}</span>
                    </div>
                    <div v-if="getItemWarnings.length === 0" class="no-warnings">
                        No item warnings found
                    </div>
                </div>
            </div>
            <div class="window__tab skills" v-else-if="activeTab === 'skills'">
                <div class="abilities-container">
                    <AbilityButton v-for="ability in ABILITIES" :ability="ability" :player="player.combat"
                        :enemy="dummyEnemy" :castAbility="castAbility" :key="ability.name" />
                </div>
            </div>            <div class="window__tab variables" v-else-if="activeTab === 'variables'">
                <table class="variables-table">
                    <thead>
                        <tr>
                            <th>Variable</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(value, key) in player.variables" :key="key">
                            <td>{{ key }}</td>
                            <td>{{ value }}</td>
                        </tr>
                        <tr v-if="Object.keys(player.variables).length === 0">
                            <td colspan="2" class="no-variables">No variables set</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="window__tab json" v-else-if="activeTab === 'json'">
                <div class="json-controls">
                    <select v-model="selectedJsonObject">
                        <option value="player">Player</option>
                        <option value="screens">Screens</option>
                        <option value="enemies">Enemies</option>
                    </select>
                </div>
                <div class="json-viewer">
                    <VueJsonPretty 
                        :data="jsonData" 
                        :deep="10"
                        :showLine="true"
                        :showDoubleQuotes="true"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.dev-tools {
    inset: 2em;
    
    .window__content {
        display: flex;
        flex-direction: column;
        height: calc(100% - 2em - 1px);
    }
    
    .window__tab {
        flex: 1;
        overflow: auto;

        &.items {
            height: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
        
        &.skills {
            height: 100%;
            
            .abilities-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-content: flex-start;
                width: 80%;

                .ability__tooltip {
                    left: unset;
                    right: 0;
                    top: 0;
                    translate: 100% -1px;
                }
            }
        }
    }

    .item-container {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding-top: 1px;

        height: 100%;

        .item__tooltip {
            left: unset;
            right: 0;
            top: 0;
            translate: 100% -1px;
        }
    }
    
    .item-warning-list {
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 100%;
        overflow-y: auto;
        
        h3 {
            margin-top: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 5px;
        }
        
        .item-warning {
            display: flex;
            align-items: center;
            gap: 10px;
            background-color: rgba(255, 255, 255, 0.05);
            padding: 5px;

            .item-inline {
                
            }
            
            .warning-reason {
                color: #ff6b6b;
            }
        }
        
        .no-warnings {
            color: #aaa;
            text-align: center;
            padding: 20px 0;
        }
    }
}

.variables-table {
    width: 100%;
    border-collapse: collapse;
    color: #ddd;
    height: fit-content;
    
    th, td {
        padding: 6px 10px;
        text-align: left;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    th {
        background-color: rgba(0, 0, 0, 0.3);
        font-weight: bold;
    }
    
    tr:nth-child(odd) {
        background-color: rgba(255, 255, 255, 0.05);
    }
    
    tr:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }    
    .no-variables {
        text-align: center;
        padding: 12px;
        font-style: italic;
        color: #888;
    }
}

.window__tab.json {
    display: flex;
    flex-direction: column;
    height: 100%;
    
    .json-controls {
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.2);
        
        select {
            padding: 5px 10px;
            background-color: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            
            &:focus {
                outline: none;
                border-color: rgba(255, 255, 255, 0.3);
            }
        }
    }
}

.vjs-tree {
    background-color: rgba(30, 30, 30, 0.3);
    padding: 1em;
    
    .vjs-key {
        color: #9cdcfe;
    }

    .vjs-indent-unit {
        width: 2em;

        &.has-line {
            border-left: 1px solid hsla(0, 0%, 100%, 0.1);
        }
    }
    
    .vjs-tree-node:hover {
        background-color: hsla(0, 0%, 100%, 0.1);
    }
    
    .vjs-value {
        &.vjs-value-string {
            color: #ce9178;
        }
        &.vjs-value-null, &.vjs-value-boolean {
            color: #569cd6;
        }
        &.vjs-value-number {
            color: #b5cea8;
        }
    }
}
</style>
