const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Player
let player = {
  x: 100,
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

// Obstacles
let obstacles = [];
const scrollSpeed = 5;

// Game state
let gameOver = false;

// Input
let keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  // Restart if game over and R is pressed
  if (gameOver && e.code === "KeyR") {
    restartGame();
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Initialize obstacles
function createObstacles() {
  obstacles = [
    { x: 600, y: 300, width: 40, height: 40, color: "black" },
    { x: 900, y: 300, width: 40, height: 80, color: "black" },
    { x: 1200, y: 300, width: 60, height: 40, color: "black" }
  ];
}

// Restart game
function restartGame() {
  player.y = 300;
  player.velocityY = 0;
  player.jumping = false;
  createObstacles();
  gameOver = false;
}

// Update game
function update() {
  if (gameOver) return;

  // Jump
  if (keys["Space"] && !player.jumping) {
    player.velocityY = jumpPower;
    player.jumping = true;
  }

  // Gravity
  player.y += player.velocityY;
  player.velocityY += gravity;

  // Ground collision
  if (player.y > groundY) {
    player.y = groundY;
    player.velocityY = 0;
    player.jumping = false;
  }

  // Move obstacles
  for (let obs of obstacles) {
    obs.x -= scrollSpeed;

    // Reset obstacle if offscreen
    if (obs.x + obs.width < 0) {
      obs.x = canvas.width + Math.random() * 400;
      obs.height = 40 + Math.random() * 60;
    }

    // Collision detection
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      gameOver = true;
    }
  }
}

// Draw game
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ground
  ctx.fillStyle = "green";
  ctx.fillRect(0, groundY + 40, canvas.width, 60);

  // Player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Obstacles
  for (let obs of obstacles) {
    ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  }

  // Game Over message
  if (gameOver) {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 90, canvas.height / 2);
    ctx.font = "20px Arial";
    ctx.fillText("Press R to Restart", canvas.width / 2 - 100, canvas.height / 2 + 40);
  }
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

createObstacles();
gameLoop();
