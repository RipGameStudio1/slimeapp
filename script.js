const API_URL = 'https://neutral-marylou-slimeapp-2e3dcce0.koyeb.app';

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
    let isDark = false;

    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        isDark = true;
        window.isDarkTheme = true; // Добавьте эту строку
    }

    themeToggle.addEventListener('click', function() {
        const icon = this.querySelector('i');
        icon.style.animation = 'none';
        void icon.offsetWidth;
        icon.style.animation = 'themeToggleRotate 0.5s ease';

        isDark = !isDark;
        window.isDarkTheme = isDark; // Добавьте эту строку
        
        if (isDark) {
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

        showToast(isDark ? 'Dark mode enabled' : 'Light mode enabled');
    });

    themeToggle.style.opacity = '0';
    setTimeout(() => {
        themeToggle.style.transition = 'opacity 0.3s ease';
        themeToggle.style.opacity = '1';
    }, 100);
}

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
            
            // Если на сервере фарминг неактивен, но у нас активен
            if (!serverData.isActive && this.isActive) {
                await this.completeFarming();
                return;
            }
            
            // Если на сервере активный фарминг
            if (serverData.isActive && serverData.startTime) {
                const serverStartTime = new Date(serverData.startTime).getTime();
                const now = Date.now();
                const elapsedTime = now - serverStartTime;
                
                // Если время фарминга истекло
                if (elapsedTime >= this.farmingDuration) {
                    await this.completeFarming();
                    return;
                }
                
                // Если на текущем клиенте другое время старта или неактивный фарминг
                if (!this.isActive || this.startTime !== serverStartTime) {
                    this.startTime = serverStartTime;
                    this.isActive = true;
                    this.baseAmount = parseFloat(serverData.limeAmount);
                    this.resumeFarming(elapsedTime);
                }
            }
            
            // Синхронизация баланса только если фарминг неактивен
            if (!this.isActive) {
                this.limeAmount = parseFloat(serverData.limeAmount);
                this.baseAmount = this.limeAmount;
                this.updateLimeDisplay();
            }
            
            // Остальная синхронизация
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
    async loadReferralData() {
        try {
            console.log('Loading referral data...'); // Отладочный лог
            const response = await fetch(`${API_URL}/api/users/${this.userId}/referrals`);
            
            if (!response.ok) {
                console.error('Response not OK:', response.status, response.statusText);
                throw new Error('Failed to load referral data');
            }
            
            const data = await response.json();
            console.log('Received referral data:', data); // Отладочный лог
            
            if (!data.referralCode) {
                console.error('No referral code in response');
                throw new Error('Referral code is missing in response');
            }
            
            this.referralCode = data.referralCode;
            this.updateReferralUI(data);
        } catch (error) {
            console.error('Error loading referral data:', error);
            // Показываем более информативное сообщение об ошибке
            showToast(`Failed to load referral data: ${error.message}`);
        }
    }
    
    updateReferralUI(data) {
        console.log('Updating referral UI with data:', data); // Отладочный лог
    
        // Обновляем статистику
        const countElement = document.getElementById('referral-count');
        const earningsElement = document.getElementById('referral-earnings');
        const referralLink = document.getElementById('referral-link');
    
        if (countElement) countElement.textContent = data.referralCount || 0;
        if (earningsElement) earningsElement.textContent = (data.totalEarnings || 0).toFixed(5);
    
        // Обновляем реферальную ссылку
        if (referralLink) {
            if (data.referralCode) {
                const botUsername = 'LimeSlimeBot'; // Убедитесь, что это правильное имя бота
                referralLink.value = `https://t.me/${botUsername}?start=${data.referralCode}`;
            } else {
                referralLink.value = 'Loading...';
            }
        } else {
            console.error('Referral link element not found');
        }
    
        // Обновляем список рефералов
        const referralListBody = document.getElementById('referral-list-body');
        if (referralListBody) {
            referralListBody.innerHTML = ''; // Очищаем текущий список
    
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
        } else {
            console.error('Referral list body element not found');
        }
    }
    
    initReferralSystem() {
        console.log('Initializing referral system...'); // Отладочный лог
        
        const copyButton = document.getElementById('copy-link');
        const referralLink = document.getElementById('referral-link');
    
        if (!copyButton || !referralLink) {
            console.error('Required referral elements not found');
            return;
        }
    
        // Начальная загрузка данных
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
    
        // Периодическое обновление данных
        setInterval(() => this.loadReferralData(), 30000);
    }

    resumeFarming(elapsedTime) {
        // Очищаем существующие интервалы
        if (this.farmingInterval) {
            clearInterval(this.farmingInterval);
            this.farmingInterval = null;
        }
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
        if (this.farmingTimeout) {
            clearTimeout(this.farmingTimeout);
            this.farmingTimeout = null;
        }

        // Если прошло больше времени чем длительность фарминга, сразу завершаем
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

        // Вычисляем оставшееся время
        const remainingTime = this.farmingDuration - elapsedTime;
        
        // Устанавливаем таймер на точное время завершения
        this.farmingTimeout = setTimeout(() => {
            this.completeFarming();
        }, remainingTime);
        // Интервал только для обновления UI
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

        // Сохраняем данные реже
        this.saveInterval = setInterval(() => {
            if (this.isActive) {
                this.saveUserData(this.limeAmount);
            }
        }, 5000);
    }

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
        // Проверяем, не был ли уже завершен фарминг
        if (!this.isActive) return;

        // Сразу устанавливаем флаг неактивности
        this.isActive = false;

        // Очищаем все таймеры и интервалы
        if (this.farmingInterval) {
            clearInterval(this.farmingInterval);
            this.farmingInterval = null;
        }
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
        }
        if (this.farmingTimeout) {
            clearTimeout(this.farmingTimeout);
            this.farmingTimeout = null;
        }
        
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
            // Отправляем финальное состояние на сервер и ждем подтверждения
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
        } catch (error) {
            console.error('Error completing farming:', error);
            // В случае ошибки пытаемся сохранить обычным способом
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
            void limeAmountElement.offsetWidth; // Trigger reflow
            limeAmountElement.classList.add('number-change');
            
            // Добавляем эффект обновления для stat-value
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
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.dataset.section;
                
                // Скрываем все секции
                document.querySelector('.main-content').style.display = 'none';
                document.querySelector('.play-section').style.display = 'none';
                document.querySelector('.referrals-section').style.display = 'none';
                
                // Показываем нужную секцию
                if (section === 'main') {
                    document.querySelector('.main-content').style.display = 'block';
                } else if (section === 'play') {
                    document.querySelector('.play-section').style.display = 'block';
                } else if (section === 'referrals') {
                    document.querySelector('.referrals-section').style.display = 'block';
                    window.farmingSystem.loadReferralData(); // Обновляем данные при переключении на вкладку
                }
                
                // Обновляем активную навигацию
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                this.classList.add('active');
            });
        });
    
        // Инициализация карточек игр
        document.querySelectorAll('.game-card').forEach((card, index) => {
            card.style.setProperty('--card-index', index);
        });
        // Периодическая синхронизация каждые 10 секунд
        setInterval(() => {
            this.syncWithServer();
        }, 10000);

        // Синхронизация при возвращении вкладки в активное состояние
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.syncWithServer();
            }
        });

        // Синхронизация при восстановлении подключения к интернету
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

//обработчики для всех кнопок
document.querySelectorAll('.play-btn, .farming-button').forEach(button => {
    button.addEventListener('click', createRipple);
});

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

function initBackgroundEffect() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
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
    
            // Задаём фиксированный цвет для блобов
            vec3 blobColor = vec3(0.6, 0.8, 0.3); // Светло-зеленый цвет
            
            // Применяем цвет равномерно
            float alpha = smoothstep(0.8, 1.2, field) * 0.3;
            
            if (isDark) {
                blobColor *= 0.7; // Немного темнее для тёмной темы
            }
            
            gl_FragColor = vec4(blobColor, alpha);
        }
    `;

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

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Ошибка линковки программы:', gl.getProgramInfoLog(program));
    }

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

    const blobs = Array(8).fill().map(() => ({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        vx: (Math.random() - 0.5) * 0.009,
        vy: (Math.random() - 0.5) * 0.009
    }));

    function updateBlobs() {
        blobs.forEach(blob => {
            blob.x += blob.vx;
            blob.y += blob.vy;

            if (Math.abs(blob.x) > 1) blob.vx *= -1;
            if (Math.abs(blob.y) > 1) blob.vy *= -1;
        });
    }

    function resizeCanvas() {
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * pixelRatio;
        canvas.height = window.innerHeight * pixelRatio;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    function render(time) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        updateBlobs();

        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.uniform1f(timeLocation, time * 0.001);
        gl.uniform1i(isDarkLocation, window.isDarkTheme ? 1 : 0);

        const blobPositions = new Float32Array(blobs.flatMap(blob => [blob.x, blob.y]));
        
        gl.uniform2fv(blobsLocation, blobPositions);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    initUserData();
    initThemeToggle();
    window.farmingSystem = new FarmingSystem();
    window.farmingSystem.initReferralSystem();
    initBackgroundEffect();

    // Инициализация игровых карточек
    const playSection = document.createElement('div');
    playSection.className = 'play-section';
    playSection.style.display = 'none';
    
    playSection.innerHTML = `
        <div class="games-container">
            <div class="game-card">
                <img src="https://via.placeholder.com/400x225" class="game-image" alt="Dice Game">
                <div class="game-overlay">
                    <div class="game-status new">New</div>
                    <div class="game-title">Dice Game</div>
                    <div class="game-stats">
                        <div class="stat">
                            <span>🎲 Multiplier x2</span>
                        </div>
                        <div class="stat">
                            <span>💰 Min Bet: 10</span>
                        </div>
                    </div>
                    <button class="play-btn">Play Now</button>
                </div>
            </div>

            <div class="game-card">
                <img src="https://via.placeholder.com/400x225" class="game-image" alt="Coin Flip">
                <div class="game-overlay">
                    <div class="game-status popular">Popular</div>
                    <div class="game-title">Coin Flip</div>
                    <div class="game-stats">
                        <div class="stat">
                            <span>🎯 50/50</span>
                        </div>
                        <div class="stat">
                            <span>💰 Min Bet: 5</span>
                        </div>
                    </div>
                    <button class="play-btn">Play Now</button>
                </div>
            </div>

            <div class="game-card">
                <img src="https://via.placeholder.com/400x225" class="game-image" alt="Slots">
                <div class="game-overlay">
                    <div class="game-status premium">Premium</div>
                    <div class="game-title">Slots</div>
                    <div class="game-stats">
                        <div class="stat">
                            <span>🎰 Jackpot</span>
                        </div>
                        <div class="stat">
                            <span>💰 Min Bet: 20</span>
                        </div>
                    </div>
                    <button class="play-btn premium-btn">Play Now</button>
                </div>
            </div>
        </div>
    `;

    document.querySelector('.container').appendChild(playSection);

    // Обработчики для кнопок игр
    document.querySelectorAll('.play-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const gameTitle = this.closest('.game-card').querySelector('.game-title').textContent;
            showToast(`Starting ${gameTitle}...`);
            
            // Здесь можно добавить логику запуска игр
            this.classList.add('disabled');
            setTimeout(() => {
                this.classList.remove('disabled');
            }, 1500);
        });
    });

    // Эффект параллакса для игровых карточек
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = card.getBoundingClientRect();
            const x = (e.clientX - left) / width - 0.5;
            const y = (e.clientY - top) / height - 0.5;
            
            const image = card.querySelector('.game-image');
            image.style.transform = `
                scale(1.05) 
                rotateY(${x * 5}deg) 
                rotateX(${y * -5}deg)
            `;
        });

        card.addEventListener('mouseleave', () => {
            const image = card.querySelector('.game-image');
            image.style.transform = 'scale(1) rotateY(0) rotateX(0)';
        });
    });
});
