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

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const mainContent = document.querySelector('.main-content');
    const playContent = document.querySelector('.play-content');
    const farmingButton = document.querySelector('.farming-button');

    function hideAllSections() {
        mainContent.style.display = 'none';
        playContent.style.display = 'none';
    }

    function showSection(sectionName) {
        hideAllSections();
        farmingButton.style.display = 'none'; // Скрываем кнопку по умолчанию

        switch(sectionName) {
            case 'main':
                mainContent.style.display = 'block';
                farmingButton.style.display = 'flex';
                break;
            case 'play':
                playContent.style.display = 'block';
                break;
            // Добавьте другие секции по мере их создания
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });

    // Показываем main section по умолчанию
    showSection('main');
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
            limeAmountElement.classList.add('number-change');
            setTimeout(() => limeAmountElement.classList.remove('number-change'), 300);
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initUserData();
    initThemeToggle();
    initNavigation();
    window.farmingSystem = new FarmingSystem();

    // Обработчики для кнопок игр
    document.querySelectorAll('.game-button').forEach(button => {
        button.addEventListener('click', function() {
            const gameTitle = this.closest('.game-card').querySelector('.game-title').textContent;
            
            switch(gameTitle) {
                case 'Lime Clicker':
                    startLimeClicker();
                    break;
                case 'Lime Runner':
                    startLimeRunner();
                    break;
            }
        });
    });
});

function startLimeClicker() {
    showToast('Lime Clicker will be available soon!');
}

function startLimeRunner() {
    showToast('Lime Runner will be available soon!');
}
