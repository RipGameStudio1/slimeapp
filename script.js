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
        window.isDarkTheme = true;
    }

    themeToggle.addEventListener('click', function() {
        const icon = this.querySelector('i');
        icon.style.animation = 'none';
        void icon.offsetWidth;
        icon.style.animation = 'themeToggleRotate 0.5s ease';

        isDark = !isDark;
        window.isDarkTheme = isDark;
        
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

    async addXp(amount) {
        const previousXp = this.xp;
        const previousLevel = this.level;
        
        this.xp += amount;
        const requiredXp = this.calculateXpForLevel(this.level);
        
        if (this.xp >= requiredXp) {
            await this.levelUp();
        } else {
            // Сохраняем новое значение XP
            const saved = await window.farmingSystem.saveUserData();
            if (!saved) {
                // Если сохранение не удалось, откатываем изменения
                this.xp = previousXp;
            }
        }
        
        this.updateDisplay();
    }

    async levelUp() {
        const previousLevel = this.level;
        this.level++;
        this.xp = 0;
        
        // Сначала сохраняем данные
        const saved = await window.farmingSystem.saveUserData();
        
        if (saved) {
            showToast(`Level Up! Now level ${this.level}`);
            this.levelElement.classList.add('number-change');
            setTimeout(() => this.levelElement.classList.remove('number-change'), 300);
        } else {
            // Если сохранение не удалось, откатываем изменения
            this.level = previousLevel;
            this.updateDisplay();
        }
    }

    updateDisplay() {
        const requiredXp = this.calculateXpForLevel(this.level);
        const progress = (this.xp / requiredXp) * 100;
        
        this.levelElement.textContent = this.level;
        this.speedElement.textContent = '1x';
        this.progressElement.style.width = `${Math.min(progress, 100)}%`;
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

class DailyRewardSystem {
    constructor() {
        this.modal = document.querySelector('.daily-reward-modal');
        this.dayNumber = this.modal.querySelector('.day-number');
        this.limeReward = this.modal.querySelector('.lime-reward');
        this.attemptsReward = this.modal.querySelector('.attempts-reward');
        this.claimButton = this.modal.querySelector('.claim-reward-btn');
        
        this.claimButton.addEventListener('click', () => this.claimReward());
    }

    async checkDailyReward() {
        try {
            const response = await fetch(`${API_URL}/api/users/${window.farmingSystem.userId}`);
            const userData = await response.json();
            
            const lastReward = userData.lastDailyReward ? new Date(userData.lastDailyReward) : null;
            const now = new Date();
            
            if (!lastReward || 
                now.getDate() !== lastReward.getDate() || 
                now.getMonth() !== lastReward.getMonth() || 
                now.getFullYear() !== lastReward.getFullYear()) {
                
                // Проверяем, не прервалась ли серия
                let nextStreak = 1; // По умолчанию начинаем с 1
                if (lastReward) {
                    const lastRewardDate = new Date(lastReward);
                    lastRewardDate.setHours(0, 0, 0, 0);
                    const todayDate = new Date(now);
                    todayDate.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((todayDate - lastRewardDate) / (24 * 60 * 60 * 1000));
                    
                    if (daysDiff === 1) {
                        // Если зашёл на следующий день - увеличиваем серию
                        nextStreak = (userData.dailyRewardStreak || 0) + 1;
                    }
                }
                
                const rewardDay = Math.min(nextStreak, 7);
                
                this.dayNumber.textContent = nextStreak;
                this.limeReward.textContent = rewardDay * 10;
                this.attemptsReward.textContent = rewardDay;
                
                this.modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                
                this.initAnimations();
                this.createStarRain();
            }
        } catch (error) {
            console.error('Error checking daily reward:', error);
            showToast('Failed to check daily reward');
        }
    }

    async claimReward() {
        try {
            this.claimButton.disabled = true;
            this.claimButton.textContent = 'Получение...';
            
            const response = await fetch(`${API_URL}/api/users/${window.farmingSystem.userId}/daily-reward`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to claim reward');
            
            const result = await response.json();
            
            const flash = document.createElement('div');
            flash.className = 'reward-flash';
            this.modal.appendChild(flash);
            
            window.farmingSystem.limeAmount = result.totalLime;
            window.farmingSystem.slimeNinjaAttempts = result.totalAttempts;
            window.farmingSystem.updateLimeDisplay();
            window.farmingSystem.updateSlimeNinjaAttempts();
            
            showToast(`Получено: ${result.limeReward} $lime и ${result.attemptsReward} попыток!`);
            
            this.createStarRain();
            
            this.modal.style.animation = 'modalClose 0.5s ease forwards';
            
            setTimeout(() => {
                this.modal.style.display = 'none';
                this.modal.style.animation = '';
                document.body.style.overflow = 'auto';
                flash.remove();
            }, 500);
            
            this.animateRewardClaim(result.limeReward, result.attemptsReward);
            
        } catch (error) {
            console.error('Error claiming reward:', error);
            showToast('Failed to claim reward. Please try again.');
            this.claimButton.disabled = false;
            this.claimButton.textContent = 'Получить награду';
        }
    }

    createStarRain() {
        const starRain = document.createElement('div');
        starRain.className = 'star-rain';
        this.modal.appendChild(starRain);
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createStar(starRain);
            }, i * 100);
        }

        setTimeout(() => {
            starRain.remove();
        }, 8000);
    }

    createStar(container) {
        const star = document.createElement('div');
        star.className = 'star';
        
        const startPos = Math.random() * 100;
        star.style.left = `${startPos}%`;
        
        const duration = 3 + Math.random() * 4;
        star.style.animation = `starFall ${duration}s linear infinite`;
        
        const size = 10 + Math.random() * 10;
        star.style.fontSize = `${size}px`;
        
        const colors = [
            '#FFD700', // Gold
            '#FFA500', // Orange
            '#FF8C00', // Dark Orange
            '#FFB6C1', // Light Pink
            '#FF69B4'  // Hot Pink
        ];
        star.style.color = colors[Math.floor(Math.random() * colors.length)];
        
        const rotation = Math.random() * 360;
        star.style.transform = `rotate(${rotation}deg)`;
        
        star.style.setProperty('--twinkle-delay', `${Math.random() * 2}s`);

        container.appendChild(star);

        setTimeout(() => {
            star.remove();
        }, duration * 1000);
    }

    animateRewardClaim(limeAmount, attempts) {
        const limeText = document.createElement('div');
        limeText.className = 'floating-reward';
        limeText.textContent = `+${limeAmount} $lime`;
        document.body.appendChild(limeText);

        const attemptsText = document.createElement('div');
        attemptsText.className = 'floating-reward';
        attemptsText.textContent = `+${attempts} attempts`;
        document.body.appendChild(attemptsText);

        setTimeout(() => {
            limeText.remove();
            attemptsText.remove();
        }, 2000);
    }

    initAnimations() {
        this.modal.querySelector('.streak-counter').style.opacity = '0';
        this.modal.querySelector('.streak-description').style.opacity = '0';
        this.modal.querySelector('.rewards-container').style.opacity = '0';
        this.modal.querySelector('.claim-reward-btn').style.opacity = '0';

        setTimeout(() => {
            this.modal.querySelector('.streak-counter').style.opacity = '1';
            this.modal.querySelector('.streak-counter').style.transform = 'scale(1)';
        }, 100);

        setTimeout(() => {
            this.modal.querySelector('.streak-description').style.opacity = '1';
        }, 300);

        setTimeout(() => {
            this.modal.querySelector('.rewards-container').style.opacity = '1';
        }, 500);

        setTimeout(() => {
            this.modal.querySelector('.claim-reward-btn').style.opacity = '1';
        }, 700);
    }
}

class FarmingSystem {
    constructor() {
        this.button = document.querySelector('.farming-button');
        this.buttonContent = document.querySelector('.farming-button-content');
        this.farmingDuration = 30 * 1000; // 30 секунд
        this.isActive = false;
        this.limeAmount = 0;
        this.userId = null;
        this.updateInterval = null;
        
        this.levelSystem = new LevelSystem();
        this.achievementSystem = new AchievementSystem();
        this.dailyRewardSystem = new DailyRewardSystem();
        this.slimeNinjaAttempts = 5;
        
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
            if (!response.ok) throw new Error('Failed to load user data');
            
            const userData = await response.json();
            
            this.limeAmount = parseFloat(userData.limeAmount);
            this.isActive = userData.isActive;
            this.slimeNinjaAttempts = userData.slimeNinjaAttempts;
            
            this.levelSystem.level = userData.level;
            this.levelSystem.xp = userData.xp;
            
            // Загружаем достижения
            Object.keys(userData.achievements || {}).forEach(key => {
                if (this.achievementSystem.achievements[key]) {
                    this.achievementSystem.achievements[key].completed = userData.achievements[key];
                }
            });

            // Если есть активный фарминг
            if (userData.isActive && userData.startTime) {
                this.resumeFarmingFromServer(userData);
            }

            this.updateAllDisplays();
            this.dailyRewardSystem.checkDailyReward();
            this.init();
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Failed to load user data');
        } finally {
            hideLoadingIndicator();
        }
    }

    async startFarming() {
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}/start-farming`, {
                method: 'POST'
            });
            
            if (!response.ok) throw new Error('Failed to start farming');
            
            const data = await response.json();
            this.isActive = true;
            this.button.classList.add('disabled');
            
            // Создаем прогресс-бар
            if (!this.button.querySelector('.farming-progress')) {
                const progressBar = document.createElement('div');
                progressBar.classList.add('farming-progress');
                this.button.insertBefore(progressBar, this.buttonContent);
            }
            
            this.startUpdates();
            showToast('Farming started!');
        } catch (error) {
            console.error('Error starting farming:', error);
            showToast('Failed to start farming');
        }
    }

    startUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Обновляем каждые 50мс для плавной анимации
        this.updateInterval = setInterval(async () => {
            await this.updateFromServer();
        }, 16);
    }
    async updateFromServer() {
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}`);
            if (!response.ok) throw new Error('Failed to update');
            
            const data = await response.json();
            
            if (data.isActive && data.currentProgress) {
                // Обновляем прогресс во время активного фарминга
                const progress = data.currentProgress;
                
                // Обновляем прогресс-бар
                const progressBar = this.button.querySelector('.farming-progress');
                if (progressBar) {
                    progressBar.style.width = `${progress.progress}%`;
                }
    
                // Обновляем время
                this.buttonContent.textContent = `Farming: ${progress.remainingTime} seconds`;
    
                // Обновляем баланс
                this.limeAmount = progress.currentLimeAmount;
                this.updateLimeDisplay();
    
                // Обновляем опыт
                this.levelSystem.xp = progress.currentXp;
                this.levelSystem.updateDisplay();
    
                // Проверяем уровень
                const requiredXp = this.levelSystem.calculateXpForLevel(this.levelSystem.level);
                if (this.levelSystem.xp >= requiredXp) {
                    this.levelSystem.levelUp();
                }
            } else if (!data.isActive && this.isActive) {
                // Фарминг завершен
                this.completeFarming(data);
            } else if (!this.isActive) {
                // Обычное обновление данных
                this.updateAllData(data);
            }
        } catch (error) {
            console.error('Error updating:', error);
        }
    }

    updateProgress(progress) {
        const progressBar = this.button.querySelector('.farming-progress');
        if (progressBar) {
            progressBar.style.width = `${progress.progress}%`;
        }
        
        const remainingSeconds = Math.ceil(30 - (progress.progress * 0.3));
        this.buttonContent.textContent = `Farming: ${remainingSeconds} seconds`;
        
        // Обновляем текущий баланс
        if (progress.earned !== undefined) {
            this.limeAmount = parseFloat(progress.earned);
            this.updateLimeDisplay();
        }
    
        // Обновляем текущий опыт
        if (progress.currentXp !== undefined) {
            this.levelSystem.xp = progress.currentXp;
            this.levelSystem.updateDisplay();
            
            // Проверяем уровень
            const requiredXp = this.levelSystem.calculateXpForLevel(this.levelSystem.level);
            if (this.levelSystem.xp >= requiredXp) {
                this.levelSystem.levelUp();
            }
        }
    }

    async completeFarming(data) {
        this.isActive = false;
        this.button.classList.remove('disabled');
        this.buttonContent.textContent = 'Start Farming';
        
        const progressBar = this.button.querySelector('.farming-progress');
        if (progressBar) {
            progressBar.remove();
        }
    
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    
        // Обновляем финальные данные
        this.limeAmount = parseFloat(data.limeAmount);
        this.levelSystem.xp = data.xp;
        this.levelSystem.level = data.level;
        
        this.updateAllDisplays();
        showToast('Farming completed!');
    }

    updateAllData(data) {
        this.limeAmount = parseFloat(data.limeAmount);
        this.levelSystem.level = data.level;
        this.levelSystem.xp = data.xp;
        this.slimeNinjaAttempts = data.slimeNinjaAttempts;

        this.updateAllDisplays();
    }

    updateAllDisplays() {
        this.updateLimeDisplay();
        this.levelSystem.updateDisplay();
        this.updateSlimeNinjaAttempts();
        this.achievementSystem.updateDisplay();
    }

    updateLimeDisplay() {
        const limeAmountElement = document.querySelector('.lime-amount');
        const formattedNumber = this.limeAmount.toFixed(5);
        
        if (limeAmountElement.textContent !== formattedNumber) {
            limeAmountElement.classList.remove('number-change');
            void limeAmountElement.offsetWidth;
            limeAmountElement.classList.add('number-change');
        }
        
        limeAmountElement.textContent = formattedNumber;
    }

    updateSlimeNinjaAttempts() {
        const attemptsElement = document.querySelector('.attempts-count');
        if (attemptsElement) {
            attemptsElement.textContent = this.slimeNinjaAttempts;
            
            const playButton = document.querySelector('.game-card[data-game="slime-ninja"] .play-btn');
            if (playButton) {
                if (this.slimeNinjaAttempts <= 0) {
                    playButton.classList.add('disabled');
                    playButton.textContent = 'Нет попыток';
                } else {
                    playButton.classList.remove('disabled');
                    playButton.textContent = 'Play Now';
                }
            }
        }
    }

    async resumeFarmingFromServer(userData) {
        const startTime = new Date(userData.startTime).getTime();
        const now = Date.now();
        const elapsedTime = now - startTime;
        
        if (elapsedTime < this.farmingDuration) {
            this.isActive = true;
            this.button.classList.add('disabled');
            
            if (!this.button.querySelector('.farming-progress')) {
                const progressBar = document.createElement('div');
                progressBar.classList.add('farming-progress');
                this.button.insertBefore(progressBar, this.buttonContent);
            }
            
            this.startUpdates();
        }
    }

    init() {
        this.button.addEventListener('click', () => {
            if (!this.isActive) {
                this.startFarming();
            }
        });

        // Регулярное обновление данных каждые 5 секунд
        setInterval(() => {
            if (!this.isActive) {
                this.updateFromServer();
            }
        }, 5000);

        // Обновление при возвращении на вкладку
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.updateFromServer();
            }
        });

        // Обновление при восстановлении соединения
        window.addEventListener('online', () => {
            this.updateFromServer();
        });

        // Инициализация навигации
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
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

        // Инициализация анимаций для игровых карточек
        document.querySelectorAll('.game-card').forEach((card, index) => {
            card.style.setProperty('--card-index', index);
        });
    }

    async loadReferralData() {
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}/referrals`);
            if (!response.ok) throw new Error('Failed to load referral data');
            
            const data = await response.json();
            this.updateReferralUI(data);
        } catch (error) {
            console.error('Error loading referral data:', error);
            showToast('Failed to load referral data');
        }
    }

    updateReferralUI(data) {
        const countElement = document.getElementById('referral-count');
        const earningsElement = document.getElementById('referral-earnings');
        const referralLink = document.getElementById('referral-link');

        if (countElement) countElement.textContent = data.referralCount || 0;
        if (earningsElement) earningsElement.textContent = (data.totalEarnings || 0).toFixed(5);
        if (referralLink && data.referralCode) {
            const botUsername = 'LimeSlimeBot';
            referralLink.value = `https://t.me/${botUsername}?start=${data.referralCode}`;
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
    
            vec3 blobColor = vec3(0.796, 0.910, 0.588);
            
            if (isDark) {
                blobColor *= 0.5;
            } else {
                blobColor *= 0.5;
            }
            
            float alpha = smoothstep(1.0, 1.0, field) * 0.5;
            
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
    initBackgroundEffect();

    // Обработчики для кнопок игр
    document.querySelectorAll('.play-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            if (this.classList.contains('disabled')) {
                showToast('Недостаточно попыток! Вернитесь завтра или заработайте больше.');
                return;
            }
    
            const gameCard = this.closest('.game-card');
            const gameTitle = gameCard.querySelector('.game-title').textContent;
            
            if (gameTitle === 'SLIME NINJA') {
                try {
                    const response = await fetch(`${API_URL}/api/users/${window.farmingSystem.userId}`);
                    if (!response.ok) throw new Error('Failed to fetch user data');
                    
                    const userData = await response.json();
                    
                    if (userData.slimeNinjaAttempts <= 0) {
                        showToast('Недостаточно попыток! Вернитесь завтра или заработайте больше.');
                        window.farmingSystem.slimeNinjaAttempts = 0;
                        window.farmingSystem.updateSlimeNinjaAttempts();
                        return;
                    }
    
                    const success = await window.farmingSystem.updateAttempts(
                        userData.slimeNinjaAttempts - 1
                    );
                    
                    if (success) {
                        localStorage.setItem('currentAttempts', userData.slimeNinjaAttempts - 1);
                        window.location.href = 'cutterindex.html';
                    } else {
                        showToast('Ошибка обновления попыток. Попробуйте снова.');
                    }
                } catch (error) {
                    console.error('Error checking attempts:', error);
                    showToast('Ошибка проверки попыток. Попробуйте снова.');
                }
                return;
            }
            if (gameTitle === 'LUCKoMETR') {
                window.location.href = 'luckometr.html';
            }
            showToast(`Starting ${gameTitle}...`);
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
