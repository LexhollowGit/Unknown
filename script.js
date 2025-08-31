const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Player
let player = {
  x: 100, // fixed near the left
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

// Obstacles (moving platforms / blocks)
let obstacles = [
  { x: 600, y: 300, width: 40, height: 40, color: "black" },
  { x: 900, y: 300, width: 40, height: 80, color: "black" },
  { x: 1200, y: 300, width: 60, height: 40, color: "black" }
];

const scrollSpeed = 5;

// Input
let keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

// Update game
function update() {
  // Jump (space key)
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

  // Move obstacles left
  for (let obs of obstacles) {
    obs.x -= scrollSpeed;

    // Reset obstacle when it goes off screen
    if (obs.x + obs.width < 0) {
      obs.x = canvas.width + Math.random() * 400; // respawn ahead
      obs.height = 40 + Math.random() * 60;       // random size
    }

    // Collision detection (basic)
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      alert("Game Over! Refresh to restart.");
      document.location.reload();
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
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
