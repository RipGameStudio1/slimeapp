const API_URL = 'https://neutral-marylou-slimeapp-2e3dcce0.koyeb.app';

// WebGL переменные и шейдеры
let canvas, gl, program;
let isDarkTheme = false;

const vertexShaderSource = `
    attribute vec2 position;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 blobs[8];
    uniform float time;
    uniform bool isDark;

    float getBlobField(vec2 point, vec2 center, float radius) {
        float dist = length(point - center);
        return radius / dist;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= resolution.x / resolution.y;
        
        float field = 0.0;
        
        for(int i = 0; i < 8; i++) {
            field += getBlobField(uv, blobs[i], 0.065);
        }

        vec3 color;
        float pulse = abs(sin(time * 0.3));
        
        if (isDark) {
            color = vec3(0.1, 0.1, 0.15) * pulse;
        } else {
            color = vec3(0.8, 0.9, 0.8) * pulse;
        }
        
        float alpha = smoothstep(1.0, 1.0, field) * 0.15;
        
        gl_FragColor = vec4(color, alpha);
    }
`;
function checkPerformance() {
    const fps = [];
    let lastTime = performance.now();
    let frame = 0;

    function measureFPS() {
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;
        
        fps.push(1000 / delta);
        if (fps.length > 30) fps.shift();
        
        frame++;
        if (frame < 60) {
            requestAnimationFrame(measureFPS);
        } else {
            const avgFPS = fps.reduce((a, b) => a + b) / fps.length;
            if (avgFPS < 30) {
                // Уменьшаем качество для слабых устройств
                blobs.length = Math.min(blobs.length, 4);
                canvas.style.opacity = '0.8';
            }
        }
    }

    requestAnimationFrame(measureFPS);
}
// WebGL вспомогательные функции
function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Ошибка компиляции шейдера:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initWebGL() {
    try {
        canvas = document.getElementById('canvas');
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            throw new Error('WebGL не поддерживается');
        }

        const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        if (!vertexShader || !fragmentShader) {
            throw new Error('Ошибка создания шейдеров');
        }

        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Ошибка линковки программы');
        }
        updateBlobsWithMouse = addInteractivity();
        return { gl, program };
    } catch (error) {
        console.error('Ошибка инициализации WebGL:', error);
        canvas.style.display = 'none';
        document.body.style.background = 'linear-gradient(45deg, #f3f4f6, #fff)';
        document.body.setAttribute('data-webgl-failed', 'true');
        return null;
    }
}
// Классы основного приложения
class LevelSystem {
    constructor() {
        this.level = 1;
        this.xp = 0;
        this.multiplier = 1;
        this.levelElement = document.getElementById('level');
        this.speedElement = document.getElementById('speed');
        this.progressElement = document.getElementById('level-progress');
    }

    calculateXpForLevel(level) {
        return Math.floor(100 * Math.pow(1.5, level));
    }

    getMultiplier() {
        return 1;
    }

    addXp(amount) {
        this.xp += amount;
        const requiredXp = this.calculateXpForLevel(this.level);
        
        if (this.xp >= requiredXp) {
            this.levelUp();
        }
        
        this.updateDisplay();
    }

    levelUp() {
        this.level++;
        this.xp = 0;
        showToast(`Level Up! Now level ${this.level}`);
        this.levelElement.classList.add('number-change');
        setTimeout(() => this.levelElement.classList.remove('number-change'), 300);
    }

    updateDisplay() {
        const requiredXp = this.calculateXpForLevel(this.level);
        const progress = (this.xp / requiredXp) * 100;
        
        this.levelElement.textContent = this.level;
        this.speedElement.textContent = '1x';
        this.progressElement.style.width = `${progress}%`;
    }
}

class AchievementSystem {
    constructor() {
        this.achievements = {
            firstFarm: {
                id: 'first-farm',
                title: 'First Steps',
                description: 'Complete first farming',
                reward: 10,
                completed: false
            },
            speedDemon: {
                id: 'speed-demon',
                title: 'Speed Demon',
                description: 'Reach 2x speed',
                reward: 50,
                completed: false
            },
            millionaire: {
                id: 'millionaire',
                title: 'Millionaire',
                description: 'Get 1,000,000 $lime',
                reward: 1000,
                completed: false
            }
        };
    }

    checkAchievements(stats) {
        const { limeAmount, farmingCount, farmingSpeed } = stats;
        
        if (!this.achievements.firstFarm.completed && farmingCount > 0) {
            this.unlockAchievement('firstFarm');
        }
        
        if (!this.achievements.speedDemon.completed && farmingSpeed >= 2) {
            this.unlockAchievement('speedDemon');
        }
        
        if (!this.achievements.millionaire.completed && limeAmount >= 1000000) {
            this.unlockAchievement('millionaire');
        }
    }

    unlockAchievement(id) {
        const achievement = this.achievements[id];
        if (!achievement.completed) {
            achievement.completed = true;
            showToast(`🏆 Achievement unlocked: ${achievement.title}!`);
            celebrateAchievement(); // Вызов эффекта для WebGL фона
            
            const card = document.querySelector(`[data-id="${achievement.id}"]`);
            if (card) {
                card.classList.add('completed');
            }
        }
    }

    updateDisplay() {
        Object.keys(this.achievements).forEach(key => {
            const achievement = this.achievements[key];
            const card = document.querySelector(`[data-id="${achievement.id}"]`);
            if (card && achievement.completed) {
                card.classList.add('completed');
            }
        });
    }
}
// WebGL и анимация фона
const blobs = Array(8).fill().map(() => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    vx: (Math.random() - 0.5) * 0.009,
    vy: (Math.random() - 0.5) * 0.009,
    scale: 1
}));

function setupWebGL() {
    const webglSetup = initWebGL();
    if (!webglSetup) return false;

    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, 'resolution');
    const blobsLocation = gl.getUniformLocation(program, 'blobs');
    const timeLocation = gl.getUniformLocation(program, 'time');
    const isDarkLocation = gl.getUniformLocation(program, 'isDark');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return {
        resolutionLocation,
        blobsLocation,
        timeLocation,
        isDarkLocation
    };
}

function updateBlobs() {
    blobs.forEach(blob => {
        blob.x += blob.vx;
        blob.y += blob.vy;

        if (Math.abs(blob.x) > 1) blob.vx *= -1;
        if (Math.abs(blob.y) > 1) blob.vy *= -1;
    });
}

function addInteractivity() {
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width * 2 - 1;
        mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    return function updateBlobsWithMouse() {
        targetX += (mouseX - targetX) * 0.1;
        targetY += (mouseY - targetY) * 0.1;

        blobs.forEach((blob, index) => {
            if (index === 0) {
                blob.x += (targetX - blob.x) * 0.05;
                blob.y += (targetY - blob.y) * 0.05;
            } else {
                blob.x += blob.vx + (targetX - blob.x) * 0.01;
                blob.y += blob.vy + (targetY - blob.y) * 0.01;
            }
        });
    };
}

function resizeCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * pixelRatio;
    canvas.height = window.innerHeight * pixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
}

function celebrateAchievement() {
    blobs.forEach(blob => {
        blob.vx *= 2;
        blob.vy *= 2;
        blob.scale = 1.5;
    });

    setTimeout(() => {
        blobs.forEach(blob => {
            blob.vx /= 2;
            blob.vy /= 2;
            blob.scale = 1;
        });
    }, 2000);
}

function render(time, locations) {
    if (document.hidden) return requestAnimationFrame(() => render(time, locations));

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    if (updateBlobsWithMouse) updateBlobsWithMouse();
    updateBlobs();

    const farmingActive = document.querySelector('.farming-button')?.classList.contains('disabled');
    if (farmingActive) {
        const pulseIntensity = Math.sin(time * 0.003) * 0.2 + 0.8;
        blobs.forEach(blob => {
            blob.scale = pulseIntensity;
        });
    }

    gl.uniform2f(locations.resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(locations.timeLocation, time * 0.001);
    gl.uniform1i(locations.isDarkLocation, isDarkTheme ? 1 : 0);

    const blobPositions = new Float32Array(blobs.flatMap(blob => [
        blob.x * (blob.scale || 1),
        blob.y * (blob.scale || 1)
    ]));
    
    gl.uniform2fv(locations.blobsLocation, blobPositions);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    requestAnimationFrame((newTime) => render(newTime, locations));
}
// Основной класс FarmingSystem
class FarmingSystem {
    constructor() {
        this.button = document.querySelector('.farming-button');
        this.buttonContent = document.querySelector('.farming-button-content');
        this.farmingDuration = 30 * 1000; // 30 секунд
        this.rewardAmount = 70;
        this.isActive = false;
        this.limeAmount = 0;
        this.farmingCount = 0;
        this.startTime = null;
        this.lastUpdate = null;
        this.userId = null;
        this.farmingInterval = null;
        this.saveInterval = null;
        this.farmingTimeout = null;
        this.referralCode = null;
        
        this.levelSystem = new LevelSystem();
        this.achievementSystem = new AchievementSystem();
        
        this.initUser();
    }

    async initUser() {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            this.userId = tg.initDataUnsafe.user.id;
            await this.loadUserData();
        }
    }
    
    async loadUserData() {
        showLoadingIndicator();
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}`);
            if (!response.ok) {
                throw new Error('Failed to load user data');
            }
            const userData = await response.json();
            
            this.farmingCount = userData.farmingCount || 0;
            this.isActive = userData.isActive || false;
            this.levelSystem.level = userData.level || 1;
            this.levelSystem.xp = userData.xp || 0;
            this.referralCode = userData.referralCode;
    
            if (userData.startTime && this.isActive) {
                this.startTime = new Date(userData.startTime).getTime();
                const now = Date.now();
                const elapsedTime = now - this.startTime;
                
                if (elapsedTime < this.farmingDuration) {
                    const earnRate = this.rewardAmount / this.farmingDuration;
                    const earnedSoFar = earnRate * elapsedTime;
                    
                    this.baseAmount = parseFloat(userData.limeAmount) - earnedSoFar;
                    this.limeAmount = parseFloat(userData.limeAmount);
                    
                    this.resumeFarming(elapsedTime);
                } else {
                    this.limeAmount = parseFloat(userData.limeAmount);
                    this.baseAmount = this.limeAmount;
                    this.completeFarming();
                }
            } else {
                this.limeAmount = parseFloat(userData.limeAmount) || 0;
                this.baseAmount = this.limeAmount;
            }
            
            Object.keys(userData.achievements || {}).forEach(key => {
                if (this.achievementSystem.achievements[key]) {
                    this.achievementSystem.achievements[key].completed = userData.achievements[key];
                }
            });
    
            this.updateLimeDisplay();
            this.levelSystem.updateDisplay();
            this.achievementSystem.updateDisplay();
            this.initReferralSystem();
            
            this.init();
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Failed to load user data. Please try again later.');
        } finally {
            hideLoadingIndicator();
        }
    }

    async syncWithServer() {
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}`);
            if (!response.ok) throw new Error('Sync failed');
            
            const serverData = await response.json();
            
            if (!serverData.isActive && this.isActive) {
                await this.completeFarming();
                return;
            }
            
            if (serverData.isActive && serverData.startTime) {
                const serverStartTime = new Date(serverData.startTime).getTime();
                const now = Date.now();
                const elapsedTime = now - serverStartTime;
                
                if (elapsedTime >= this.farmingDuration) {
                    await this.completeFarming();
                    return;
                }
                
                if (!this.isActive || this.startTime !== serverStartTime) {
                    this.startTime = serverStartTime;
                    this.isActive = true;
                    this.baseAmount = parseFloat(serverData.limeAmount);
                    this.resumeFarming(elapsedTime);
                }
            }
            
            if (!this.isActive) {
                this.limeAmount = parseFloat(serverData.limeAmount);
                this.baseAmount = this.limeAmount;
                this.updateLimeDisplay();
            }
            
            this.farmingCount = serverData.farmingCount;
            this.levelSystem.level = serverData.level;
            this.levelSystem.xp = serverData.xp;
            this.levelSystem.updateDisplay();
            
            Object.keys(serverData.achievements || {}).forEach(key => {
                if (this.achievementSystem.achievements[key]) {
                    this.achievementSystem.achievements[key].completed = serverData.achievements[key];
                }
            });
            this.achievementSystem.updateDisplay();
            
        } catch (error) {
            console.error('Sync error:', error);
        }
    }
    // Продолжение класса FarmingSystem
    async loadReferralData() {
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}/referrals`);
            
            if (!response.ok) {
                throw new Error('Failed to load referral data');
            }
            
            const data = await response.json();
            
            if (!data.referralCode) {
                throw new Error('Referral code is missing in response');
            }
            
            this.referralCode = data.referralCode;
            this.updateReferralUI(data);
        } catch (error) {
            console.error('Error loading referral data:', error);
            showToast(`Failed to load referral data: ${error.message}`);
        }
    }
    
    updateReferralUI(data) {
        const countElement = document.getElementById('referral-count');
        const earningsElement = document.getElementById('referral-earnings');
        const referralLink = document.getElementById('referral-link');
    
        if (countElement) countElement.textContent = data.referralCount || 0;
        if (earningsElement) earningsElement.textContent = (data.totalEarnings || 0).toFixed(5);
    
        if (referralLink) {
            if (data.referralCode) {
                const botUsername = 'LimeSlimeBot';
                referralLink.value = `https://t.me/${botUsername}?start=${data.referralCode}`;
            } else {
                referralLink.value = 'Loading...';
            }
        }
    
        const referralListBody = document.getElementById('referral-list-body');
        if (referralListBody) {
            referralListBody.innerHTML = '';
    
            if (data.referrals && data.referrals.length > 0) {
                data.referrals.forEach(referral => {
                    const row = document.createElement('div');
                    row.className = 'referral-row';
                    row.innerHTML = `
                        <div class="referral-user">
                            <div class="referral-avatar"></div>
                            <span class="referral-name">User ${referral.userId.slice(-4)}</span>
                        </div>
                        <div class="referral-date">${new Date(referral.joinDate).toLocaleDateString()}</div>
                        <div class="referral-earnings">${referral.earnings.toFixed(5)}</div>
                    `;
                    referralListBody.appendChild(row);
                });
            } else {
                const emptyRow = document.createElement('div');
                emptyRow.className = 'referral-row empty';
                emptyRow.innerHTML = `
                    <div class="referral-empty">
                        No referrals yet. Share your link to invite friends!
                    </div>
                `;
                referralListBody.appendChild(emptyRow);
            }
        }
    }
    
    initReferralSystem() {
        const copyButton = document.getElementById('copy-link');
        const referralLink = document.getElementById('referral-link');
    
        if (!copyButton || !referralLink) {
            console.error('Required referral elements not found');
            return;
        }
    
        this.loadReferralData();
    
        copyButton.addEventListener('click', () => {
            if (referralLink.value && referralLink.value !== 'Loading...') {
                referralLink.select();
                document.execCommand('copy');
                showToast('Referral link copied!');
            } else {
                showToast('Please wait, loading referral link...');
                this.loadReferralData();
            }
        });
    
        setInterval(() => this.loadReferralData(), 30000);
    }

    resumeFarming(elapsedTime) {
        if (this.farmingInterval) clearInterval(this.farmingInterval);
        if (this.saveInterval) clearInterval(this.saveInterval);
        if (this.farmingTimeout) clearTimeout(this.farmingTimeout);

        if (elapsedTime >= this.farmingDuration) {
            this.completeFarming();
            return;
        }

        this.isActive = true;
        this.button.classList.add('disabled');
        this.lastUpdate = Date.now();

        if (!this.button.querySelector('.farming-progress')) {
            const progressBar = document.createElement('div');
            progressBar.classList.add('farming-progress');
            this.button.insertBefore(progressBar, this.buttonContent);
        }

        const progressBar = this.button.querySelector('.farming-progress');
        const progress = (elapsedTime / this.farmingDuration) * 100;
        progressBar.style.width = `${progress}%`;

        const remainingTime = this.farmingDuration - elapsedTime;
        
        this.farmingTimeout = setTimeout(() => {
            this.completeFarming();
        }, remainingTime);

        this.farmingInterval = setInterval(() => {
            const now = Date.now();
            const currentElapsed = now - this.startTime;
            
            if (currentElapsed >= this.farmingDuration) {
                clearInterval(this.farmingInterval);
                return;
            }

            const earnRate = this.rewardAmount / this.farmingDuration;
            const totalEarned = earnRate * currentElapsed;
            
            this.limeAmount = this.baseAmount + totalEarned;
            
            this.updateLimeDisplay();
            this.levelSystem.addXp(totalEarned * 0.1);

            const progress = (currentElapsed / this.farmingDuration) * 100;
            progressBar.style.width = `${progress}%`;
            
            this.buttonContent.textContent = `Farming: ${this.formatTime(this.farmingDuration - currentElapsed)}`;
        }, 50);

        this.saveInterval = setInterval(() => {
            if (this.isActive) {
                this.saveUserData(this.limeAmount);
            }
        }, 5000);
    }
    // Продолжение класса FarmingSystem
    startFarming() {
        this.isActive = true;
        this.farmingCount++;
        this.startTime = Date.now();
        this.baseAmount = this.limeAmount;
        this.resumeFarming(0);
        this.saveUserData(this.limeAmount);
        showToast('Farming started! Come back in 30 seconds');
    }

    async completeFarming() {
        if (!this.isActive) return;

        this.isActive = false;

        if (this.farmingInterval) clearInterval(this.farmingInterval);
        if (this.saveInterval) clearInterval(this.saveInterval);
        if (this.farmingTimeout) clearTimeout(this.farmingTimeout);
        
        const totalElapsed = Date.now() - this.startTime;
        const earnRate = this.rewardAmount / this.farmingDuration;
        const totalEarned = earnRate * Math.min(totalElapsed, this.farmingDuration);
        this.limeAmount = this.baseAmount + totalEarned;
        
        this.startTime = null;
        this.button.classList.remove('disabled');
        this.buttonContent.textContent = 'Start Farming';
        
        const progressBar = this.button.querySelector('.farming-progress');
        if (progressBar) {
            progressBar.remove();
        }

        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}/complete-farming`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    limeAmount: this.limeAmount,
                    farmingCount: this.farmingCount,
                })
            });

            if (!response.ok) {
                throw new Error('Failed to complete farming');
            }

            showToast('Farming completed!');
            celebrateAchievement(); // Эффект для WebGL фона
        } catch (error) {
            console.error('Error completing farming:', error);
            await this.saveUserData(this.limeAmount);
        }
    }

    formatTime(ms) {
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${seconds} seconds`;
    }

    updateLimeDisplay() {
        const limeAmountElement = document.querySelector('.lime-amount');
        const formattedNumber = this.limeAmount.toFixed(5);
        
        if (limeAmountElement.textContent !== formattedNumber) {
            limeAmountElement.classList.remove('number-change');
            void limeAmountElement.offsetWidth;
            limeAmountElement.classList.add('number-change');
            
            const statValues = document.querySelectorAll('.stat-value');
            statValues.forEach(stat => {
                stat.classList.remove('updating');
                void stat.offsetWidth;
                stat.classList.add('updating');
            });
        }
        
        limeAmountElement.textContent = formattedNumber;
    }

    async saveUserData(exactAmount = null) {
        if (!this.userId) return;
        
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    limeAmount: exactAmount !== null ? exactAmount : this.limeAmount,
                    farmingCount: this.farmingCount,
                    isActive: this.isActive,
                    startTime: this.startTime ? new Date(this.startTime) : null,
                    level: this.levelSystem.level,
                    xp: this.levelSystem.xp,
                    achievements: Object.keys(this.achievementSystem.achievements).reduce((acc, key) => {
                        acc[key] = this.achievementSystem.achievements[key].completed;
                        return acc;
                    }, {})
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save user data');
            }
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    init() {
        this.button.addEventListener('click', () => {
            if (!this.isActive) {
                this.startFarming();
            }
        });

        // Инициализация навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = this.dataset.section;
                
                document.querySelector('.main-content').style.display = 'none';
                document.querySelector('.play-section').style.display = 'none';
                document.querySelector('.referrals-section').style.display = 'none';
                
                if (section === 'main') {
                    document.querySelector('.main-content').style.display = 'block';
                } else if (section === 'play') {
                    document.querySelector('.play-section').style.display = 'block';
                } else if (section === 'referrals') {
                    document.querySelector('.referrals-section').style.display = 'block';
                    this.loadReferralData();
                }
                
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                this.classList.add('active');
            });
        });

        setInterval(() => {
            this.syncWithServer();
        }, 10000);

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.syncWithServer();
            }
        });

        window.addEventListener('online', () => {
            this.syncWithServer();
        });

        setInterval(() => {
            this.achievementSystem.checkAchievements({
                limeAmount: this.limeAmount,
                farmingCount: this.farmingCount,
                farmingSpeed: 1
            });
        }, 1000);
    }
}
// Вспомогательные функции
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    
    const diameter = Math.max(rect.width, rect.height);
    const radius = diameter / 2;
    
    ripple.style.width = ripple.style.height = `${diameter}px`;
    ripple.style.left = `${event.clientX - rect.left - radius}px`;
    ripple.style.top = `${event.clientY - rect.top - radius}px`;
    
    ripple.classList.add('ripple');
    button.appendChild(ripple);
    
    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}

function showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <div>Loading...</div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoadingIndicator() {
    const loadingDiv = document.getElementById('loading-indicator');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

function initUserData() {
    const tg = window.Telegram.WebApp;
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        const usernameElement = document.querySelector('.username');
        usernameElement.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        
        const userIdElement = document.querySelector('.user-id');
        userIdElement.textContent = `ID: ${user.id}`;
        
        const avatarElement = document.querySelector('.avatar');
        const userId = user.id;
        const photoUrl = `https://cdn4.telegram-cdn.org/file/user${userId}.jpg`;
        
        avatarElement.style.backgroundImage = `url(${photoUrl})`;
        avatarElement.style.backgroundSize = 'cover';
        avatarElement.style.backgroundPosition = 'center';
    }
}

function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        isDarkTheme = true;
    }

    themeToggle.addEventListener('click', function() {
        const icon = this.querySelector('i');
        icon.style.animation = 'none';
        void icon.offsetWidth;
        icon.style.animation = 'themeToggleRotate 0.5s ease';

        isDarkTheme = !isDarkTheme;
        if (isDarkTheme) {
            document.body.setAttribute('data-theme', 'dark');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'light');
        }

        showToast(isDarkTheme ? 'Dark mode enabled' : 'Light mode enabled');
    });

    themeToggle.style.opacity = '0';
    setTimeout(() => {
        themeToggle.style.transition = 'opacity 0.3s ease';
        themeToggle.style.opacity = '1';
    }, 100);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Создание и инициализация canvas для WebGL
    canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    document.body.insertBefore(canvas, document.body.firstChild);
    canvas.classList.add('fade-in');

    // Инициализация WebGL
    const webglLocations = setupWebGL();
    if (webglLocations) {
        const updateBlobsWithMouse = addInteractivity();
        
        // Настройка размера canvas и обработчиков событий
        resizeCanvas();
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 250);
        });

        // Запуск анимации
        requestAnimationFrame((time) => render(time, webglLocations));
    }

    // Инициализация основного приложения
    initUserData();
    initThemeToggle();
    window.farmingSystem = new FarmingSystem();

    // Добавление обработчиков для кнопок
    document.querySelectorAll('.play-btn, .farming-button').forEach(button => {
        button.addEventListener('click', createRipple);
    });

    // Оптимизация для мобильных устройств
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        blobs.length = 4;
        blobs.forEach(blob => {
            blob.vx *= 0.5;
            blob.vy *= 0.5;
        });
    }

    // Проверка производительности
    checkPerformance();
});
