/**
 * Anti-Ban Throttling Engine
 */
export const throttleEngine = {
    /**
     * Generate a randomized delay between min and max seconds
     */
    getDelay(minSeconds, maxSeconds) {
        const min = minSeconds * 1000;
        const max = maxSeconds * 1000;
        return Math.floor(Math.random() * (max - min + 1) + min);
    },

    /**
     * Check if currently within business hours (9 AM - 9 PM)
     */
    isWithinBusinessHours() {
        const now = new Date();
        // Convert to IST (UTC + 5:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const hours = istDate.getUTCHours();
        
        return hours >= 9 && hours < 21;
    },

    /**
     * Vary message content slightly to avoid pattern detection
     */
    varyMessage(template, data) {
        let msg = template;
        
        // Personalization
        Object.entries(data).forEach(([key, value]) => {
            msg = msg.replace(new RegExp(`{${key}}`, 'g'), value || '');
        });

        // Greeting rotation
        const greetings = ['Hi', 'Hello', 'Hey', 'Namaste'];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        
        if (msg.startsWith('Hi ')) {
            msg = msg.replace(/^Hi /, `${randomGreeting} `);
        } else if (msg.startsWith('Hello ')) {
            msg = msg.replace(/^Hello /, `${randomGreeting} `);
        }
        
        // Add a random invisible character at the end to make it unique
        const invisibleChars = ['\u200B', '\u200C', '\u200D', ' '];
        const randomChar = invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
        
        return msg + randomChar;
    },

    /**
     * Calculate randomized batch pause (3-8 minutes)
     */
    getBatchPause() {
        return this.getDelay(180, 480); // 3 to 8 minutes
    },

    /**
     * Calculate session break (30-60 minutes)
     */
    getSessionBreak() {
        return this.getDelay(1800, 3600); // 30 to 60 minutes
    }
};
