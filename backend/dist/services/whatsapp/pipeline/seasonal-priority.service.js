/** Kerala-centric seasonal heuristics (IST calendar). */
export const seasonalPriorityService = {
    currentPhase(date = new Date()) {
        const month = Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'numeric' }).format(date));
        if (month >= 6 && month <= 9)
            return 'monsoon';
        if (month === 5 || month === 10)
            return 'planting';
        if (month === 7 || month === 8)
            return 'disease_peak';
        return 'normal';
    },
    resolve(date = new Date()) {
        const phase = this.currentPhase(date);
        switch (phase) {
            case 'monsoon':
                return {
                    phase,
                    broadcastPriorityBoost: 15,
                    preferWeatherAlerts: true,
                    preferDapAlerts: true,
                };
            case 'planting':
                return {
                    phase,
                    broadcastPriorityBoost: 10,
                    preferWeatherAlerts: true,
                    preferDapAlerts: true,
                };
            case 'disease_peak':
                return {
                    phase,
                    broadcastPriorityBoost: 12,
                    preferWeatherAlerts: true,
                    preferDapAlerts: false,
                };
            default:
                return {
                    phase: 'normal',
                    broadcastPriorityBoost: 0,
                    preferWeatherAlerts: false,
                    preferDapAlerts: true,
                };
        }
    },
    adjustBroadcastPriority(basePriority, date = new Date()) {
        const seasonal = this.resolve(date);
        return Math.min(100, basePriority + seasonal.broadcastPriorityBoost);
    },
};
//# sourceMappingURL=seasonal-priority.service.js.map