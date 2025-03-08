export type SpriteSet = {
    idle: Sprite;
    attack: Sprite;
    hit: Sprite;
    death: Sprite;
};

export type Sprite = {
	image: HTMLImageElement
	width: number	// Frame width
	height: number	// Frame height
	frameCount: number
}

export const createSprite = (src: string, width: number, height: number, frameCount: number): Sprite => {
	const image = new Image();
	image.src = src;
	return {
		image,
		width,
		height,
		frameCount
	}
}

export const SPRITES: Record<string, {
	idle: Sprite
	attack?: Sprite
	hit?: Sprite
	death?: Sprite
}> = {
	fly: {
		idle: createSprite("./entity/fly/idle.png", 512, 512, 20),
		attack: createSprite("./entity/fly/attack.png", 512, 512, 24),
		hit: createSprite("./entity/fly/hit.png", 512, 512, 20),
		death: createSprite("./entity/fly/death.png", 512, 512, 36)
	},
	player: {
		idle: createSprite("./entity/player/idle.png", 512, 512, 24),
		attack: createSprite("./entity/player/attack.png", 512, 512, 16),
		hit: createSprite("./entity/player/hit.png", 512, 512, 12),
		death: createSprite("./entity/fly/death.png", 512, 512, 36)
	}
};