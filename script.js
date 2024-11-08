function initUserData() {
    const tg = window.Telegram.WebApp;
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        
        // Обновляем имя пользователя
        const usernameElement = document.querySelector('.username');
        usernameElement.textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        
        // Обновляем аватар
        const avatarElement = document.querySelector('.avatar');
        avatarElement.style.backgroundImage = `url(${user.photo_url})`;
        avatarElement.style.backgroundSize = 'cover';
        avatarElement.style.backgroundPosition = 'center';
        
        // Включаем отображение аватара в настройках WebApp
        tg.expand();
        tg.enableClosingConfirmation();
        tg.MainButton.setParams({
            text_color: '#FFFFFF'
        });
    }
}

function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const icon = themeToggle.querySelector('i');
    
    // Проверяем сохраненную тему
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
        this.loadState();
    }

    loadState() {
        const savedState = localStorage.getItem('levelSystem');
        if (savedState) {
            const { level, xp } = JSON.parse(savedState);
            this.level = level;
            this.xp = xp;
            this.multiplier = this.getMultiplier();
            this.updateDisplay();
        }
    }

    saveState() {
        localStorage.setItem('levelSystem', JSON.stringify({
            level: this.level,
            xp: this.xp
        }));
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
        this.saveState();
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
        this.loadState();
    }

    loadState() {
        const savedState = localStorage.getItem('achievements');
        if (savedState) {
            const saved = JSON.parse(savedState);
            Object.keys(saved).forEach(key => {
                if (this.achievements[key]) {
                    this.achievements[key].completed = saved[key].completed;
                }
            });
        }
        this.updateDisplay();
    }

    saveState() {
        localStorage.setItem('achievements', JSON.stringify(this.achievements));
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
            
            this.saveState();
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
        
        this.levelSystem = new LevelSystem();
        this.achievementSystem = new AchievementSystem();
        
        this.loadState();
        this.init();
    }

    loadState() {
        const savedState = localStorage.getItem('farmingState');
        if (savedState) {
            const state = JSON.parse(savedState);
            this.limeAmount = state.limeAmount || 0;
            this.farmingCount = state.farmingCount || 0;
            this.updateLimeDisplay();
        }
    }

    saveState() {
        localStorage.setItem('farmingState', JSON.stringify({
            limeAmount: this.limeAmount,
            farmingCount: this.farmingCount,
            isActive: this.isActive,
            startTime: this.lastUpdate
        }));
    }

    init() {
        // Проверяем сохраненное состояние фарминга
        const savedState = localStorage.getItem('farmingState');
        if (savedState) {
            const { startTime, isActive } = JSON.parse(savedState);
            if (isActive) {
                const currentTime = Date.now();
                const elapsedTime = currentTime - startTime;
                
                if (elapsedTime < this.farmingDuration) {
                    this.startFarming(elapsedTime);
                } else {
                    this.completeFarming();
                }
            }
        }

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

        // Автосохранение каждые 30 секунд
        setInterval(() => {
            this.saveState();
        }, 30000);
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
        this.lastUpdate = Date.now();
        this.farmingRate = this.rewardAmount / this.farmingDuration;

        this.saveState();

        this.farmingInterval = setInterval(() => {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastUpdate;
            const earnedAmount = (this.farmingRate * deltaTime) * this.levelSystem.multiplier;
            
            this.limeAmount += earnedAmount;
            this.updateLimeDisplay();
            this.levelSystem.addXp(earnedAmount * 10);
            
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

        this.saveState();
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
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const farmingSystem = new FarmingSystem();
    initThemeToggle();
	initUserData();
});