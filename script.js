const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Player
let player = {
  x: 50,
  y: 300,
  width: 40,
  height: 40,
  color: "red",
  velocityY: 0,
  jumping: false
};

const gravity = 0.8;
const jumpPower = -12;
const groundY = 340;

// Keys
let keys = {};

// Input
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Update game
function update() {
  // Move left/right
  if (keys["ArrowRight"]) player.x += 5;
  if (keys["ArrowLeft"]) player.x -= 5;

  // Jump
  if (keys["Space"] && !player.jumping) {
    player.velocityY = jumpPower;
    player.jumping = true;
  }

  // Apply gravity
  player.y += player.velocityY;
  player.velocityY += gravity;

  // Ground collision
  if (player.y > groundY) {
    player.y = groundY;
    player.velocityY = 0;
    player.jumping = false;
  }
}

// Draw game
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ground
  ctx.fillStyle = "green";
  ctx.fillRect(0, groundY + 40, canvas.width, 60);

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
