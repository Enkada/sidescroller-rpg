import { ref } from "vue"
import type { CombatEntity } from "./CombatEntity"
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../globals"

export type FloatingTextType = "damage" | "heal" | "crit-damage" | "mana" | "buff" | "debuff"

export type FloatingText = {
	text: string
	x: number
	y: number
	type: FloatingTextType
	time: number
}

export const floatingText = ref<FloatingText[]>([]);

export const addFloatingText = (text: string, combat: CombatEntity, type: FloatingTextType) => {
    const offset = type === "crit-damage" || type === "damage"
        ? combat.id === "player" ? 100 : -100 
        : combat.id === "player" ? -100 : 100;
	floatingText.value.push({
		text,
		x: SCREEN_WIDTH / 2 + Math.random() * 50 + offset,
		y: SCREEN_HEIGHT / 2 + 50 + Math.random() * 50,
		type,
		time: Date.now()
	})
}