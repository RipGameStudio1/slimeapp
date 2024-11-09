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
            
            // Загружаем базовые данные
            this.farmingCount = userData.farmingCount || 0;
            this.levelSystem.level = userData.level || 1;
            this.levelSystem.xp = userData.xp || 0;
    
            // Проверяем статус фарминга
            if (userData.isActive && userData.startTime) {
                const startTime = new Date(userData.startTime).getTime();
                const now = Date.now();
                const elapsedTime = now - startTime;
                
                if (elapsedTime < this.farmingDuration) {
                    // Фарминг все еще активен
                    const earnRate = this.rewardAmount / this.farmingDuration;
                    const earnedSoFar = earnRate * elapsedTime;
                    
                    this.baseAmount = parseFloat(userData.limeAmount);
                    this.limeAmount = this.baseAmount + earnedSoFar;
                    this.isActive = true;
                    this.startTime = startTime;
                    
                    this.resumeFarming(elapsedTime);
                } else {
                    // Фарминг завершился во время отсутствия
                    const completedFarmings = Math.floor(elapsedTime / this.farmingDuration);
                    const earnedTotal = this.rewardAmount * completedFarmings;
                    
                    this.limeAmount = parseFloat(userData.limeAmount) + earnedTotal;
                    this.baseAmount = this.limeAmount;
                    this.farmingCount += completedFarmings;
                    this.isActive = false;
                    this.startTime = null;
    
                    if (completedFarmings > 0) {
                        showToast(`Offline farming completed: +${earnedTotal.toFixed(5)} $lime`);
                        await this.saveUserData(this.limeAmount);
                    }
                }
            } else {
                // Нет активного фарминга
                this.limeAmount = parseFloat(userData.limeAmount) || 0;
                this.baseAmount = this.limeAmount;
                this.isActive = false;
                this.startTime = null;
            }
    
            // Загружаем достижения
            if (userData.achievements) {
                Object.keys(userData.achievements).forEach(key => {
                    if (this.achievementSystem.achievements[key]) {
                        this.achievementSystem.achievements[key].completed = userData.achievements[key];
                    }
                });
            }
    
            // Обновляем отображение
            this.updateLimeDisplay();
            this.levelSystem.updateDisplay();
            this.achievementSystem.updateDisplay();
    
            // Обновляем состояние кнопки
            if (!this.isActive) {
                this.button.classList.remove('disabled');
                this.buttonContent.textContent = 'Start Farming';
            }
    
            this.init();
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Failed to load user data. Please try again later.');
        } finally {
            hideLoadingIndicator();
        }
    }
    async startFarming() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.startTime = Date.now();
        this.baseAmount = this.limeAmount;
        this.button.classList.add('disabled');
        
        const progressBar = document.createElement('div');
        progressBar.classList.add('farming-progress');
        this.button.insertBefore(progressBar, this.buttonContent);
        
        try {
            await this.saveUserData(this.limeAmount);
            
            this.farmingInterval = setInterval(() => {
                const now = Date.now();
                const elapsedTime = now - this.startTime;
                const remainingTime = this.farmingDuration - elapsedTime;
                const progress = (elapsedTime / this.farmingDuration) * 100;
                
                if (elapsedTime >= this.farmingDuration) {
                    this.completeFarming();
                } else {
                    const earnRate = this.rewardAmount / this.farmingDuration;
                    const earned = earnRate * elapsedTime;
                    this.limeAmount = this.baseAmount + earned;
                    this.updateLimeDisplay();
                    progressBar.style.width = `${progress}%`;
                    
                    // Обновляем текст кнопки с оставшимся временем
                    const secondsLeft = Math.ceil(remainingTime / 1000);
                    this.buttonContent.textContent = `Farming... ${secondsLeft}s`;
                }
            }, 50);
            
            this.saveInterval = setInterval(() => {
                this.saveUserData(this.limeAmount);
            }, 5000);
            
        } catch (error) {
            console.error('Error starting farming:', error);
            this.completeFarming();
        }
    }

    async completeFarming() {
        clearInterval(this.farmingInterval);
        clearInterval(this.saveInterval);
        
        this.isActive = false;
        this.startTime = null;
        this.farmingCount++;
        
        this.button.classList.remove('disabled');
        this.buttonContent.textContent = 'Start Farming';
        
        const progressBar = this.button.querySelector('.farming-progress');
        if (progressBar) {
            progressBar.remove();
        }

        try {
            await fetch(`${API_URL}/api/users/${this.userId}/complete-farming`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    limeAmount: this.limeAmount,
                    farmingCount: this.farmingCount,
                })
            });

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

        // Инициализация навигации и секций
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.dataset.section;
                
                // Скрываем все секции
                document.querySelector('.main-content').style.display = 'none';
                document.querySelector('.play-section').style.display = 'none';
                
                // Показываем нужную секцию
                if (section === 'main') {
                    document.querySelector('.main-content').style.display = 'block';
                } else if (section === 'play') {
                    document.querySelector('.play-section').style.display = 'block';
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

        // Проверка достижений каждую секунду
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

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    initUserData();
    initThemeToggle();
    window.farmingSystem = new FarmingSystem();

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
