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
                
                const nextStreak = (userData.dailyRewardStreak || 0) + 1;
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
        this.slimeNinjaAttempts = 5;
        
        this.levelSystem = new LevelSystem();
        this.achievementSystem = new AchievementSystem();
        this.dailyRewardSystem = new DailyRewardSystem();
        
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
            this.slimeNinjaAttempts = userData.slimeNinjaAttempts || 0;
    
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
            this.updateSlimeNinjaAttempts();
            
            // Проверяем ежедневную награду
            this.dailyRewardSystem.checkDailyReward();
            
            this.init();
        } catch (error) {
            console.error('Error loading user data:', error);
            showToast('Failed to load user data. Please try again later.');
        } finally {
            hideLoadingIndicator();
        }
    }

    updateSlimeNinjaAttempts() {
        const attemptsElement = document.querySelector('.attempts-count');
        if (attemptsElement) {
            attemptsElement.textContent = this.slimeNinjaAttempts;
            
            // Добавляем визуальную индикацию, если попыток нет
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
    async updateAttempts(newAmount) {
        try {
            // Проверяем, что новое количество не отрицательное
            if (newAmount < 0) {
                showToast('Недостаточно попыток!');
                return false;
            }
    
            const response = await fetch(`${API_URL}/api/users/${this.userId}/update-attempts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attempts: newAmount
                })
            });
    
            if (!response.ok) throw new Error('Failed to update attempts');
            
            const result = await response.json();
            this.slimeNinjaAttempts = result.attempts;
            this.updateSlimeNinjaAttempts();
            
            return true;
        } catch (error) {
            console.error('Error updating attempts:', error);
            return false;
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
            if (this.slimeNinjaAttempts !== serverData.slimeNinjaAttempts) {
                this.slimeNinjaAttempts = serverData.slimeNinjaAttempts;
                this.updateSlimeNinjaAttempts();
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
            this.slimeNinjaAttempts = serverData.slimeNinjaAttempts;
            this.updateSlimeNinjaAttempts();
            
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
            console.log('Loading referral data...');
            const response = await fetch(`${API_URL}/api/users/${this.userId}/referrals`);
            
            if (!response.ok) {
                console.error('Response not OK:', response.status, response.statusText);
                throw new Error('Failed to load referral data');
            }
            
            const data = await response.json();
            console.log('Received referral data:', data);
            
            if (!data.referralCode) {
                console.error('No referral code in response');
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
        console.log('Updating referral UI with data:', data);
    
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
        } else {
            console.error('Referral link element not found');
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
        } else {
            console.error('Referral list body element not found');
        }
    }
    
    initReferralSystem() {
        console.log('Initializing referral system...');
        
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
                    slimeNinjaAttempts: this.slimeNinjaAttempts, // Убедимся, что это поле всегда отправляется
                    achievements: Object.keys(this.achievementSystem.achievements).reduce((acc, key) => {
                        acc[key] = this.achievementSystem.achievements[key].completed;
                        return acc;
                    }, {})
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save user data');
            }
    
            const data = await response.json();
            // Обновляем локальное значение попыток из ответа сервера
            this.slimeNinjaAttempts = data.slimeNinjaAttempts;
            this.updateSlimeNinjaAttempts();
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
                
                // Добавляем класс hidden ко всем секциям
                document.querySelector('.main-content').classList.add('hidden');
                document.querySelector('.play-section').classList.add('hidden');
                document.querySelector('.referrals-section').classList.add('hidden');
                
                // Удаляем display: none
                document.querySelector('.main-content').style.display = '';
                document.querySelector('.play-section').style.display = '';
                document.querySelector('.referrals-section').style.display = '';
                
                // Небольшая задержка перед показом новой секции
                setTimeout(() => {
                    if (section === 'main') {
                        document.querySelector('.main-content').classList.remove('hidden');
                        document.querySelector('.play-section').style.display = 'none';
                        document.querySelector('.referrals-section').style.display = 'none';
                    } else if (section === 'play') {
                        document.querySelector('.play-section').classList.remove('hidden');
                        document.querySelector('.main-content').style.display = 'none';
                        document.querySelector('.referrals-section').style.display = 'none';
                    } else if (section === 'referrals') {
                        document.querySelector('.referrals-section').classList.remove('hidden');
                        document.querySelector('.main-content').style.display = 'none';
                        document.querySelector('.play-section').style.display = 'none';
                        window.farmingSystem.loadReferralData();
                    }
                }, 50);
                
                // Обновляем активную навигацию
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                this.classList.add('active');
            });
        });
    
        document.querySelectorAll('.game-card').forEach((card, index) => {
            card.style.setProperty('--card-index', index);
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
