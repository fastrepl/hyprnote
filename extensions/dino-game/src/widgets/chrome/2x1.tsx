import "./dino.css";

import { useRef, useEffect } from "react";
import {
  type WidgetTwoByOne,
  WidgetTwoByOneWrapper,
} from "@hypr/ui/components/ui/widgets";

import spriteImage from "../../../assets/dino-game-sprite.png";

const ChromeDino2x1: WidgetTwoByOne = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    scoreInterval: 0,
    frameInterval: 0,
    groundscroll: 0,
    groundscroll2: 0,
    tempstart: 0,
    groundbool: false,
    frame: 0,
    bool: false,
    grav: 0.6,
    gamespeed: 0,
    multiS: -1,
    picS: 0,
    multiB: -1,
    picB: 0,
    onG: false,
    sprImg: new Image(),
    isButtonHovered: false,
    isJumping: false,
    isJumpButtonHeld: false,
    jumpHoldTime: 0,
    gameOverCooldown: 0,
  });

  const obsS = {
    x: 20,
    y: 230,
    w: 34,
    h: 70,
    scroll: -100,
    on: false,
  };

  const obsB = {
    x: 20,
    y: 201,
    w: 49,
    h: 100,
    scroll: -200,
    on: false,
  };

  const player = {
    x: 100,
    y: 500,
    w: 89,
    h: 94,
    normalH: 94,
    yv: 0,
    score: 0,
    hscore: 0,
    jump: 15,
    minJump: 10,
    maxJumpHoldTime: 13,
    jumpHoldForce: 0.6,
  };

  const pbox = {
    x: player.x + 20,
    y: 0,
    w: 40,
    h: 75,
  };

  const rngS = () => {
    gameStateRef.current.multiS = Math.floor(Math.random() * 3) + 1;
    gameStateRef.current.picS = 446 + Math.floor(Math.random() * 2) * 102;
  };

  const rngB = () => {
    gameStateRef.current.multiB = Math.floor(Math.random() * 3) + 1;
    gameStateRef.current.picB = 652 + Math.floor(Math.random() * 2) * 150;
  };

  const drawScores = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    currentScore: number,
    highScore: number,
  ) => {
    ctx.save();

    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillStyle = "#535353";
    ctx.textAlign = "right";

    ctx.fillText(
      currentScore.toString().padStart(5, "0"),
      canvas.width - 25,
      30,
    );

    ctx.fillText(
      "HI " + highScore.toString().padStart(5, "0"),
      canvas.width - 160,
      30,
    );

    ctx.restore();
  };

  const drawGameOverScreen = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
  ) => {
    drawScores(ctx, canvas, player.score, player.hscore);

    ctx.save();
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillStyle = "#535353";
    ctx.textAlign = "center";
    ctx.fillText("G A M E   O V E R", canvas.width / 2, canvas.height / 3);
    ctx.restore();

    const buttonX = canvas.width / 2 - 36;
    const buttonY = canvas.height / 2 - 32;

    if (gameStateRef.current.isButtonHovered) {
      ctx.fillStyle = "rgba(83, 83, 83, 0.1)";
      ctx.fillRect(buttonX, buttonY, 72, 64);
    }

    ctx.drawImage(
      gameStateRef.current.sprImg,
      2,
      2,
      72,
      64,
      buttonX,
      buttonY,
      72,
      64,
    );
  };

  const gameover = () => {
    const state = gameStateRef.current;

    if (player.score > player.hscore) {
      player.hscore = player.score;
    }

    state.gamespeed = 0;
    player.score = 0;

    player.y = 500;
    player.yv = 0;

    obsB.scroll = -200;
    obsS.scroll = -100;
    state.multiS = -1;
    state.multiB = -1;
    obsB.on = false;
    obsS.on = false;

    state.scoreInterval = 0;
    state.frameInterval = 0;
    state.groundscroll = 0;
    state.groundscroll2 = 0;
    state.tempstart = 0;
    state.groundbool = false;

    state.frame = 1338;
    state.bool = false;
  };

  const reset = () => {
    const state = gameStateRef.current;

    state.gamespeed = 7;
    player.score = 0;
    player.y = 500;
    player.yv = 0;

    obsB.scroll = -200;
    obsS.scroll = -100;
    state.multiS = -1;
    state.multiB = -1;

    state.gameOverCooldown = 30;

    state.scoreInterval = 0;
    state.frameInterval = 0;
    state.groundscroll = 0;
    state.groundscroll2 = 0;
    state.tempstart = 0;
    state.groundbool = false;
    state.isJumping = false;
    state.isJumpButtonHeld = false;
    state.jumpHoldTime = 0;

    obsB.on = false;
    obsS.on = false;
  };

  const handleKeyDown = (evt: KeyboardEvent) => {
    const state = gameStateRef.current;

    if (evt.key === "ArrowUp" || evt.key === " ") {
      if (state.onG && !state.isJumping) {
        state.isJumping = true;
        state.isJumpButtonHeld = true;
        state.jumpHoldTime = 0;
        player.yv = -player.minJump;
      } else if (state.isJumping) {
        state.isJumpButtonHeld = true;
      }

      if (state.gamespeed === 0) {
        state.gamespeed = 7;
      }
    }
  };

  const handleKeyUp = (evt: KeyboardEvent) => {
    const state = gameStateRef.current;

    if (evt.key === "ArrowUp" || evt.key === " ") {
      state.isJumpButtonHeld = false;
    }
  };

  const handleMouseMove = (evt: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || gameStateRef.current.gamespeed !== 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    const buttonX = canvas.width / 2 - 36;
    const buttonY = canvas.height / 2 - 32;
    const isHovered =
      x >= buttonX && x <= buttonX + 72 && y >= buttonY && y <= buttonY + 64;

    if (isHovered !== gameStateRef.current.isButtonHovered) {
      gameStateRef.current.isButtonHovered = isHovered;

      const ctx = canvas.getContext("2d");
      if (ctx) drawGameOverScreen(ctx, canvas);
    }
  };

  const handleClick = (evt: MouseEvent) => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      gameStateRef.current.gamespeed !== 0 ||
      gameStateRef.current.gameOverCooldown > 0
    )
      return;

    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    const buttonX = canvas.width / 2 - 36;
    const buttonY = canvas.height / 2 - 32;
    if (
      x >= buttonX &&
      x <= buttonX + 72 &&
      y >= buttonY &&
      y <= buttonY + 64
    ) {
      reset();
    }
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = gameStateRef.current;
    const plat = {
      x: 0,
      y: canvas.height - 100,
      w: canvas.width,
      h: 5,
    };

    if (state.gameOverCooldown > 0) {
      state.gameOverCooldown--;
    }

    if (state.isJumping) {
      if (
        state.isJumpButtonHeld &&
        state.jumpHoldTime < player.maxJumpHoldTime
      ) {
        player.yv -= player.jumpHoldForce;
        state.jumpHoldTime++;
      }

      player.yv += state.grav;
    } else if (!state.onG) {
      player.yv += state.grav;
    } else {
      state.isJumping = false;
      state.jumpHoldTime = 0;
    }

    player.y += player.yv;

    pbox.y = player.y + 15;

    state.scoreInterval++;

    if (state.scoreInterval > 6 && state.gamespeed !== 0) {
      player.score++;
      state.scoreInterval = 0;
    }

    if (state.gamespeed < 15 && state.gamespeed !== 0) {
      state.gamespeed = 7 + Math.min(8, player.score / 100);
    }

    state.onG = false;
    if (player.y + player.h > plat.y) {
      player.y = plat.y - player.h;
      state.onG = true;

      if (state.isJumping) {
        state.isJumping = false;
        state.jumpHoldTime = 0;
      }
    }

    const checkCollision = (obs: typeof obsB, multiVal: number) => {
      const obsLeft = canvas.width - obs.scroll;
      const obsRight = obsLeft + obs.w * multiVal;
      const obsTop = obs.y;

      const playerRight = pbox.x + pbox.w;
      const playerLeft = pbox.x;
      const playerBottom = pbox.y + pbox.h;

      return (
        playerRight > obsLeft && playerLeft < obsRight && playerBottom > obsTop
      );
    };

    if (obsB.on && state.multiB > 0 && checkCollision(obsB, state.multiB)) {
      gameover();
    }

    if (obsS.on && state.multiS > 0 && checkCollision(obsS, state.multiS)) {
      gameover();
    }

    state.frameInterval++;
    if (state.frameInterval > 5) {
      state.bool = !state.bool;
      state.frameInterval = 0;
    }

    if (state.onG) {
      state.frame = state.bool ? 1514 : 1602;
      player.h = player.normalH;
    } else {
      state.frame = 1338;
      player.h = player.normalH;
    }

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    state.groundscroll += state.gamespeed;
    ctx.drawImage(
      state.sprImg,
      0,
      104,
      2404,
      18,
      0 - state.groundscroll + state.tempstart,
      plat.y - 24,
      2404,
      18,
    );

    if (
      state.groundscroll - state.tempstart > 2404 - canvas.width ||
      state.groundbool
    ) {
      state.groundbool = true;
      state.groundscroll2 += state.gamespeed;
      ctx.drawImage(
        state.sprImg,
        0,
        104,
        canvas.width,
        18,
        0 - state.groundscroll2 + canvas.width,
        plat.y - 24,
        canvas.width,
        18,
      );

      if (
        state.groundscroll2 > canvas.width &&
        state.groundscroll - state.tempstart > 1000
      ) {
        state.tempstart = canvas.width;
        state.groundscroll = 20;
      }
      if (state.groundscroll2 > 2402) {
        state.groundscroll2 = 0;
        state.groundbool = false;
      }
    }

    if (state.gamespeed !== 0) {
      ctx.drawImage(
        state.sprImg,
        state.frame,
        0,
        88,
        94,
        player.x,
        player.y,
        player.w,
        player.h,
      );
    } else {
      ctx.drawImage(
        state.sprImg,
        1338,
        0,
        88,
        94,
        player.x,
        player.y,
        player.w,
        player.h,
      );
    }

    if (!obsB.on) {
      obsS.on = true;
      if (state.multiS === -1) {
        rngS();

        obsS.scroll = -100 - Math.floor(Math.random() * 50);
      }

      ctx.drawImage(
        state.sprImg,
        state.picS,
        2,
        obsS.w * state.multiS,
        obsS.h,
        canvas.width - obsS.scroll,
        obsS.y,
        obsS.w * state.multiS,
        obsS.h,
      );
      obsS.scroll += state.gamespeed;

      const resetDistance =
        canvas.width + obsS.w * 3 + Math.floor(Math.random() * 100);
      if (obsS.scroll > resetDistance) {
        obsS.scroll = -100;
        state.multiS = -1;
        obsS.on = false;
      }
    }

    if (!obsS.on) {
      obsB.on = true;
      if (state.multiB === -1) {
        rngB();

        obsB.scroll = -200 - Math.floor(Math.random() * 50);
      }

      ctx.drawImage(
        state.sprImg,
        652,
        2,
        obsB.w * state.multiB,
        obsB.h,
        canvas.width - obsB.scroll,
        obsB.y,
        obsB.w * state.multiB,
        obsB.h,
      );

      obsB.scroll += state.gamespeed;

      const resetDistance =
        canvas.width + obsB.w * 3 + Math.floor(Math.random() * 100);
      if (obsB.scroll > resetDistance) {
        obsB.scroll = -200;
        state.multiB = -1;
        obsB.on = false;
      }
    }

    drawScores(ctx, canvas, player.score, player.hscore);

    if (state.gamespeed === 0) {
      drawGameOverScreen(ctx, canvas);
    }

    requestAnimationFrame(update);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gameStateRef.current.sprImg.src = spriteImage;
    gameStateRef.current.sprImg.onload = () => {
      update();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <WidgetTwoByOneWrapper>
      <div className="w-full h-full">
        <div className="dino-game">
          <canvas
            ref={canvasRef}
            width={1000}
            height={400}
            className="dino-canvas"
          />
        </div>
      </div>
    </WidgetTwoByOneWrapper>
  );
};

export default ChromeDino2x1;
