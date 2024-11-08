// script.js
class Game {
    constructor() {
        this.api = new API();
        this.tg = window.Telegram.WebApp;
        this.userId = this.tg.initDataUnsafe?.user?.id;
        this.userData = null;
        
        this.levelSystem = new LevelSystem(this);
        this.achievementSystem = new AchievementSystem(this);
        this.farmingSystem = new FarmingSystem(this);
        
        this.init();
    }

    async init() {
        try {
            // Загружаем данные пользователя
            if (this.userId) {
                this.userData = await this.api.getUserData(this.userId);
                this.updateUI();
            }

            // Инициализируем UI компоненты
            this.initThemeToggle();
            this.initNavigation();
            
            // Обновляем данные каждые 30 секунд
            setInterval(() => this.refreshUserData(), 30000);
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Error loading user data');
        }
    }

    async refreshUserData() {
        try {
            this.userData = await this.api.getUserData(this.userId);
            this.updateUI();
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }

    updateUI() {
        // Обновляем отображение всех данных
        this.updateLimeDisplay();
        this.levelSystem.updateDisplay();
        this.achievementSystem.updateDisplay();
    }

    updateLimeDisplay() {
        const limeAmountElement = document.querySelector('.lime-amount');
        if (limeAmountElement) {
            limeAmountElement.textContent = this.userData.limeAmount.toFixed(5);
        }
    }

    initThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.documentElement.setAttribute(
                    'data-theme',
                    document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
                );
            });
        }
    }

    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.navigateToSection(section);
            });
        });
    }

    navigateToSection(section) {
        // Реализация навигации между разделами
        console.log(`Navigating to ${section}`);
        // TODO: Добавить логику переключения разделов
    }
}

class LevelSystem {
    constructor(game) {
        this.game = game;
        this.levelElement = document.getElementById('level');
        this.speedElement = document.getElementById('speed');
        this.progressElement = document.getElementById('level-progress');
    }

    async addXp(amount) {
        const newXp = this.game.userData.xp + amount;
        const updatedData = await this.game.api.updateUserData(this.game.userId, {
            xp: newXp
        });
        this.game.userData = updatedData;
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.levelElement) {
            this.levelElement.textContent = this.game.userData.level;
        }
        if (this.speedElement) {
            this.speedElement.textContent = `${this.getSpeedMultiplier()}x`;
        }
        if (this.progressElement) {
            const progress = this.calculateLevelProgress();
            this.progressElement.style.width = `${progress}%`;
        }
    }

    getSpeedMultiplier() {
        // Расчет множителя скорости на основе уровня
        return 1 + (this.game.userData.level - 1) * 0.1;
    }

    calculateLevelProgress() {
        // Расчет прогресса уровня
        const xpForNextLevel = this.calculateXpForNextLevel();
        const currentLevelXp = this.game.userData.xp;
        return (currentLevelXp / xpForNextLevel) * 100;
    }

    calculateXpForNextLevel() {
        return Math.floor(100 * Math.pow(1.5, this.game.userData.level));
    }
}

class AchievementSystem {
    constructor(game) {
        this.game = game;
        this.achievementCards = document.querySelectorAll('.achievement-card');
    }

    updateDisplay() {
        if (this.game.userData?.achievements) {
            Object.entries(this.game.userData.achievements).forEach(([key, completed]) => {
                const card = document.querySelector(`[data-id="${key}"]`);
                if (card) {
                    card.classList.toggle('completed', completed);
                }
            });
        }
    }

    async checkAchievements() {
        const achievements = this.game.userData.achievements;
        let updated = false;

        if (!achievements.firstFarm && this.game.userData.farmingCount > 0) {
            achievements.firstFarm = true;
            updated = true;
        }

        if (!achievements.speedDemon && this.game.levelSystem.getSpeedMultiplier() >= 2) {
            achievements.speedDemon = true;
            updated = true;
        }

        if (!achievements.millionaire && this.game.userData.limeAmount >= 1000000) {
            achievements.millionaire = true;
            updated = true;
        }

        if (updated) {
            if (updated) {
            const updatedData = await this.game.api.updateUserData(this.game.userId, {
                achievements: achievements
            });
            this.game.userData = updatedData;
            this.updateDisplay();
        }
    }
}

class FarmingSystem {
    constructor(game) {
        this.game = game;
        this.button = document.querySelector('.farming-button');
        this.buttonContent = document.querySelector('.farming-button-content');
        this.farmingDuration = 5 * 60 * 60 * 1000; // 5 hours
        this.rewardAmount = 70;
        this.isActive = false;
        
        this.init();
    }

    async init() {
        if (this.button) {
            this.button.addEventListener('click', () => this.toggleFarming());
        }

        // Проверяем, не был ли активен фарминг
        if (this.game.userData?.isActive) {
            const startTime = new Date(this.game.userData.startTime);
            const elapsedTime = Date.now() - startTime.getTime();
            if (elapsedTime < this.farmingDuration) {
                this.startFarming(elapsedTime);
            } else {
                this.completeFarming();
            }
        }
    }

    async toggleFarming() {
        if (!this.isActive) {
            await this.startFarming();
        }
    }

    async startFarming(elapsedTime = 0) {
        try {
            // Обновляем состояние в базе данных
            const updatedData = await this.game.api.startFarming(this.game.userId);
            this.game.userData = updatedData;

            this.isActive = true;
            this.button.classList.add('disabled');

            // Создаем индикатор прогресса
            if (!this.button.querySelector('.farming-progress')) {
                const progressBar = document.createElement('div');
                progressBar.classList.add('farming-progress');
                this.button.insertBefore(progressBar, this.buttonContent);
            }

            const startTime = Date.now() - elapsedTime;
            this.farmingInterval = setInterval(() => {
                const currentTime = Date.now();
                const totalElapsed = currentTime - startTime;
                const remaining = this.farmingDuration - totalElapsed;

                if (remaining <= 0) {
                    this.completeFarming();
                } else {
                    this.updateProgress(remaining);
                }
            }, 1000);

            showToast('Farming started! Come back in 5 hours');
        } catch (error) {
            console.error('Error starting farming:', error);
            showToast('Failed to start farming');
        }
    }

    async completeFarming() {
        try {
            clearInterval(this.farmingInterval);

            const earnedAmount = this.calculateReward();
            const earnedXp = earnedAmount * 10;

            // Обновляем данные в базе
            const updatedData = await this.game.api.endFarming(
                this.game.userId,
                earnedAmount,
                earnedXp
            );
            
            this.game.userData = updatedData;
            this.isActive = false;
            
            // Обновляем UI
            this.button.classList.remove('disabled');
            this.buttonContent.textContent = 'Start Farming';
            const progressBar = this.button.querySelector('.farming-progress');
            if (progressBar) {
                progressBar.remove();
            }

            // Проверяем достижения
            await this.game.achievementSystem.checkAchievements();
            
            this.game.updateUI();
            showToast('Farming completed!');
        } catch (error) {
            console.error('Error completing farming:', error);
            showToast('Error completing farming');
        }
    }

    calculateReward() {
        const baseReward = this.rewardAmount;
        const multiplier = this.game.levelSystem.getSpeedMultiplier();
        return baseReward * multiplier;
    }

    updateProgress(remainingTime) {
        const progressBar = this.button.querySelector('.farming-progress');
        const progressPercent = ((this.farmingDuration - remainingTime) / this.farmingDuration) * 100;
        const timeString = this.formatTime(remainingTime);

        if (progressBar) {
            progressBar.style.width = `${progressPercent}%`;
        }
        this.buttonContent.textContent = `Farming: ${timeString}`;
    }

    formatTime(ms) {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Вспомогательные функции
function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
