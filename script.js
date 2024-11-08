const API_URL = 'https://neutral-marylou-slimeapp-2e3dcce0.koyeb.app';

function initUserData() {
    const tg = window.Telegram.WebApp;
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        const usernameElement = document.querySelector('.username');
        usernameElement.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        
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
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    });
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
        return 1 + (this.level - 1) * 0.1;
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
        this.multiplier = this.getMultiplier();
        showToast(`Level Up! Now level ${this.level}`);
        this.levelElement.classList.add('number-change');
        setTimeout(() => this.levelElement.classList.remove('number-change'), 300);
    }

    updateDisplay() {
        const requiredXp = this.calculateXpForLevel(this.level);
        const progress = (this.xp / requiredXp) * 100;
        
        this.levelElement.textContent = this.level;
        this.speedElement.textContent = `${this.multiplier.toFixed(1)}x`;
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
            
            const card = document.querySelector(`[data-id="${id}"]`);
            if (card) {
                card.classList.add('completed');
            }
            
            if (window.farmingSystem) {
                window.farmingSystem.saveUserData();
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
        this.farmingDuration = 5 * 60 * 60 * 1000; // 5 hours
        this.rewardAmount = 70;
        this.isActive = false;
        this.limeAmount = 0;
        this.farmingCount = 0;
        this.lastUpdate = null;
        this.userId = null;
        this.lastSaveTime = Date.now();
        this.saveInterval = 1000; // сохранение каждую секунду
        
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
            
            this.limeAmount = parseFloat(userData.limeAmount) || 0;
            this.farmingCount = userData.farmingCount || 0;
            this.isActive = userData.isActive || false;
            this.lastUpdate = userData.startTime ? new Date(userData.startTime).getTime() : null;
            
            this.levelSystem.level = userData.level || 1;
            this.levelSystem.xp = userData.xp || 0;
            this.levelSystem.multiplier = this.levelSystem.getMultiplier();
            
            Object.keys(userData.achievements || {}).forEach(key => {
                if (this.achievementSystem.achievements[key]) {
                    this.achievementSystem.achievements[key].completed = userData.achievements[key];
                }
            });
            
            // Обработка офлайн-прогресса
            if (this.isActive && this.lastUpdate) {
                const now = Date.now();
                const offlineTime = now - this.lastUpdate;
                
                if (offlineTime > 0) {
                    const totalEarned = this.calculateOfflineEarnings(offlineTime);
                    this.limeAmount += totalEarned;
                    showToast(`Earned while away: ${totalEarned.toFixed(5)} $lime`);
                }
            }
            
            this.updateLimeDisplay();
            this.levelSystem.updateDisplay();
            this.achievementSystem.updateDisplay();
            
            if (this.isActive) {
                const elapsedTime = Date.now() - this.lastUpdate;
                if (elapsedTime < this.farmingDuration) {
                    this.startFarming(elapsedTime);
                } else {
                    this.completeFarming();
                }
            }
            
            this.init();
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Failed to load user data. Please try again later.');
        } finally {
            hideLoadingIndicator();
        }
    }

    calculateOfflineEarnings(offlineTime) {
        const maxOfflineTime = Math.min(offlineTime, this.farmingDuration);
        return (this.rewardAmount / this.farmingDuration) * maxOfflineTime * this.levelSystem.multiplier;
    }

    startFarming(elapsedTime = 0) {
        this.isActive = true;
        this.farmingCount++;
        this.button.classList.add('disabled');
        
        if (!this.button.querySelector('.farming-progress')) {
            const progressBar = document.createElement('div');
            progressBar.classList.add('farming-progress');
            this.button.insertBefore(progressBar, this.buttonContent);
        }

        const startTime = Date.now() - elapsedTime;
        this.lastUpdate = startTime;
        this.farmingRate = this.rewardAmount / this.farmingDuration;

        // Немедленное сохранение при старте фарминга
        this.saveUserData();

        this.farmingInterval = setInterval(() => {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastUpdate;
            const earnedAmount = (this.farmingRate * deltaTime) * this.levelSystem.multiplier;
            
            this.limeAmount += earnedAmount;
            this.updateLimeDisplay();
            this.levelSystem.addXp(earnedAmount * 10);
            
            // Сохранение каждую секунду
            if (currentTime - this.lastSaveTime >= this.saveInterval) {
                this.saveUserData();
                this.lastSaveTime = currentTime;
            }
            
            const elapsedTotal = currentTime - startTime;
            const remaining = this.farmingDuration - elapsedTotal;

            if (remaining <= 0) {
                this.completeFarming();
            } else {
                this.updateProgress(remaining);
            }

            this.lastUpdate = currentTime;
        }, 50);

        showToast('Farming started! Come back in 5 hours');
    }

    async saveUserData() {
        if (!this.userId) return;
        
        try {
            const response = await fetch(`${API_URL}/api/users/${this.userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    limeAmount: this.limeAmount,
                    farmingCount: this.farmingCount,
                    isActive: this.isActive,
                    startTime: this.lastUpdate,
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

    updateProgress(remainingTime) {
        const progressBar = this.button.querySelector('.farming-progress');
        const progressPercent = ((this.farmingDuration - remainingTime) / this.farmingDuration) * 100;
        const timeString = this.formatTime(remainingTime);

        progressBar.style.width = `${progressPercent}%`;
        this.buttonContent.textContent = `Farming: ${timeString}`;
    }

    completeFarming() {
        clearInterval(this.farmingInterval);
        this.isActive = false;
        this.button.classList.remove('disabled');
        this.buttonContent.textContent = 'Start Farming';
        
        const progressBar = this.button.querySelector('.farming-progress');
        if (progressBar) {
            progressBar.remove();
        }

        this.saveUserData();
        showToast('Farming completed!');
    }

    formatTime(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateLimeDisplay() {
        const limeAmountElement = document.querySelector('.lime-amount');
        const formattedNumber = this.limeAmount.toFixed(5);
        
        if (limeAmountElement.textContent !== formattedNumber) {
            limeAmountElement.classList.add('number-change');
            setTimeout(() => limeAmountElement.classList.remove('number-change'), 300);
        }
        
        limeAmountElement.textContent = formattedNumber;
    }

    init() {
        this.button.addEventListener('click', () => {
            if (!this.isActive) {
                this.startFarming();
            }
        });

        // Проверка достижений каждую секунду
        setInterval(() => {
            this.achievementSystem.checkAchievements({
                limeAmount: this.limeAmount,
                farmingCount: this.farmingCount,
                farmingSpeed: this.levelSystem.multiplier
            });
        }, 1000);

        // Сохранение перед закрытием страницы
        window.addEventListener('beforeunload', () => {
            if (this.isActive) {
                this.saveUserData();
            }
        });

        // Сохранение при переключении вкладок
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.isActive) {
                this.saveUserData();
            }
        });
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

document.addEventListener('DOMContentLoaded', async () => {
    initUserData();
    initThemeToggle();
    window.farmingSystem = new FarmingSystem();
});
