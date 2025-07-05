import { ANIMATION_SPEED } from "../globals";
import { SETTINGS } from "../utils";

export type SpriteSet = {
    idle: Sprite;
    attack: Sprite;
    hit: Sprite;
    death: Sprite;
};

export type Sprite = {
	image: HTMLImageElement
    src: string	
	width: number	// Frame width
	height: number	// Frame height
	frameCount: number
	animationSpeed: number
	bounds: {
		y: number // Y offset
		height: number
	}
}

export const calculateSpriteBounds = (image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return { y: 0, height: 0 };
    }
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    let startY: number | null = null;
    // Find startY from top
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 0) {
                startY = y;
                break;
            }
        }
        if (startY !== null) break;
    }

    let endY: number | null = null;
    // Find endY from bottom
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 0) {
                endY = y;
                break;
            }
        }
        if (endY !== null) break;
    }

    // Handle fully transparent image
    if (startY === null || endY === null) {
        return { y: 0, height: 0 };
    }

    return {
        y: startY,
        height: endY - startY + 1
    };
};

export const createSprite = (src: string, width: number, height: number, frameCount: number = 1, animationSpeed: number = ANIMATION_SPEED): Sprite => {
    const image = new Image();
    image.src = src;
    
    // Create a promise to wait for image load
    const loadPromise = new Promise<void>((resolve) => {
        image.onload = () => resolve();
    });
    
    // Return a sprite with temporary bounds that will be updated when loaded
    const sprite: Sprite = {
        image,
        src,
        width,
        height,
        frameCount,
        animationSpeed,
        bounds: {
            y: 0,
            height: height
        }
    };
    
    // Update bounds once image is loaded
    loadPromise.then(() => {
        if (SETTINGS.value.shadows) {
            sprite.bounds = calculateSpriteBounds(image);
        }
    });
    
    return sprite;
}

export const SPRITES: Record<string, {
	idle: Sprite
	attack?: Sprite
	hit?: Sprite
	death?: Sprite
	y: number
}> = {
	fly: {
		idle: createSprite("./entity/fly/idle.png", 512, 512, 20),
		attack: createSprite("./entity/fly/attack.png", 512, 512, 24),
		hit: createSprite("./entity/fly/hit.png", 512, 512, 20),
		death: createSprite("./entity/fly/death.png", 512, 512, 36),
		y: -105
	},
	spider: {
		idle: createSprite("./entity/spider/idle.png", 512, 288, 24),
		attack: createSprite("./entity/spider/attack.png", 512, 288, 20),
		hit: createSprite("./entity/spider/hit.png", 512, 288, 16),
		death: createSprite("./entity/spider/death.png", 480, 288, 20),
		y: 20
	},
	player: {
		idle: createSprite("./entity/player/idle.png", 512, 512, 24),
		attack: createSprite("./entity/player/attack.png", 512, 512, 25),
		hit: createSprite("./entity/player/hit.png", 512, 512, 12),
		death: createSprite("./entity/fly/death.png", 512, 512, 36),
		y: -105
	},
	sara: {
		idle: createSprite("./entity/sara/idle.png", 512, 512, 48, 64),
		attack: createSprite("./entity/sara/attack.png", 512, 512, 48, 36),
		hit: createSprite("./entity/sara/hit.png", 512, 512, 48, 28),
		death: createSprite("./entity/sara/death.png", 512, 512, 24, 76),
		y: -105
	}
};