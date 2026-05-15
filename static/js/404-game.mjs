// 404-game.mjs — Simple "catch the 404" mini-game
(function () {
    const canvas = document.getElementById('game-404-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 320, H = 240;
    canvas.width = W;
    canvas.height = H;

    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim() || '#2d4a7a';
    const secondary = style.getPropertyValue('--secondary').trim() || '#5a5a6e';

    let score = 0;
    let gameOver = false;
    let player = { x: W / 2, w: 40 };
    let falling = [];
    let spawnTimer = 0;
    const keys = {};

    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        if (gameOver && e.key === ' ') reset();
    });
    document.addEventListener('keyup', (e) => keys[e.key] = false);

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const tx = (e.touches[0].clientX - rect.left) / rect.width * W;
        player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, tx));
    }, { passive: false });

    function spawn() {
        falling.push({
            x: 20 + Math.random() * (W - 40),
            y: -20,
            speed: 1 + Math.random() * 1.5 + score * 0.1,
        });
    }

    function reset() {
        score = 0;
        gameOver = false;
        player.x = W / 2;
        falling = [];
        spawnTimer = 0;
    }

    function update() {
        if (gameOver) return;

        if (keys['ArrowLeft'] || keys['a']) player.x -= 4;
        if (keys['ArrowRight'] || keys['d']) player.x += 4;
        player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

        spawnTimer++;
        if (spawnTimer > Math.max(30, 60 - score * 2)) {
            spawn();
            spawnTimer = 0;
        }

        for (let i = falling.length - 1; i >= 0; i--) {
            falling[i].y += falling[i].speed;

            if (falling[i].y > H - 20 &&
                Math.abs(falling[i].x - player.x) < player.w / 2 + 10) {
                score++;
                falling.splice(i, 1);
                continue;
            }

            if (falling[i].y > H + 10) {
                gameOver = true;
                return;
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = accent;
        ctx.fillRect(player.x - player.w / 2, H - 16, player.w, 12);

        ctx.fillStyle = secondary;
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        for (const f of falling) {
            ctx.fillText('404', f.x, f.y);
        }

        ctx.fillStyle = accent;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + score, 8, 16);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', W / 2, H / 2 - 16);
            ctx.font = '14px sans-serif';
            ctx.fillText('Score: ' + score, W / 2, H / 2 + 8);
            ctx.font = '12px sans-serif';
            ctx.fillText('Press Space to retry', W / 2, H / 2 + 32);
        }
    }

    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }

    loop();
})();
