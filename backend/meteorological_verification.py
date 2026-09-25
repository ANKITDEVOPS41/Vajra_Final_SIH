
import numpy as np


class MeteorologicalVerification:
    """
    Complete WMO/NCMRWF-standard forecast verification suite.
    References:
    - Wilks (2011) Statistical Methods in the Atmospheric Sciences
    - Jolliffe & Stephenson (2012) Forecast Verification
    """
    
    @staticmethod
    def brier_score(prob_forecast: np.ndarray, binary_obs: np.ndarray) -> float:
        """Brier Score = mean((p - o)^2). Perfect = 0, Climatology ~0.25."""
        return float(np.mean((prob_forecast - binary_obs) ** 2))
    
    @staticmethod
    def brier_skill_score(prob_forecast: np.ndarray, binary_obs: np.ndarray, climatological_frequency: float) -> float:
        """BSS = 1 - BS/BS_clim. >0 means better than climatology."""
        bs = MeteorologicalVerification.brier_score(prob_forecast, binary_obs)
        bs_clim = float(np.mean((climatological_frequency - binary_obs) ** 2))
        if bs_clim == 0:
            return 0.0
        return 1.0 - (bs / bs_clim)
    
    @staticmethod
    def gilbert_skill_score(hits: int, false_alarms: int, misses: int, correct_negatives: int) -> float:
        """GSS (Equitable Threat Score). Accounts for hits due to random chance."""
        total = hits + false_alarms + misses + correct_negatives
        if total == 0:
            return 0.0
        
        hits_random = float((hits + misses) * (hits + false_alarms)) / total
        
        denominator = hits + misses + false_alarms - hits_random
        if denominator == 0:
            return 0.0
            
        return float((hits - hits_random) / denominator)
    
    @staticmethod
    def frequency_bias(hits: int, false_alarms: int, misses: int) -> float:
        """Bias = (hits + FA) / (hits + misses). 1.0 = unbiased."""
        denominator = hits + misses
        if denominator == 0:
            return 0.0
        return float((hits + false_alarms) / denominator)
    
    @staticmethod
    def reliability_diagram_data(prob_forecast: np.ndarray, binary_obs: np.ndarray, n_bins: int = 10) -> dict[str, np.ndarray]:
        """Returns binned forecast probabilities vs observed frequencies for reliability diagram."""
        bins = np.linspace(0, 1, n_bins + 1)
        bin_indices = np.digitize(prob_forecast, bins) - 1
        bin_indices = np.clip(bin_indices, 0, n_bins - 1)
        
        obs_freq = np.zeros(n_bins)
        mean_forecast_prob = np.zeros(n_bins)
        sample_counts = np.zeros(n_bins)
        
        for i in range(n_bins):
            mask = (bin_indices == i)
            sample_counts[i] = np.sum(mask)
            if sample_counts[i] > 0:
                obs_freq[i] = np.mean(binary_obs[mask])
                mean_forecast_prob[i] = np.mean(prob_forecast[mask])
                
        return {
            'observed_frequency': obs_freq,
            'mean_forecast_probability': mean_forecast_prob,
            'sample_counts': sample_counts,
            'bin_edges': bins
        }
    
    @staticmethod
    def rank_histogram(ensemble_forecasts: np.ndarray, observations: np.ndarray, n_bins: int = 11) -> np.ndarray:
        """
        Rank histogram for ensemble calibration assessment.
        ensemble_forecasts shape: (n_samples, n_members)
        observations shape: (n_samples,)
        n_bins is generally n_members + 1.
        """
        n_samples, n_members = ensemble_forecasts.shape
        ranks = np.zeros(n_samples, dtype=int)
        
        for i in range(n_samples):
            sorted_ens = np.sort(ensemble_forecasts[i])
            ranks[i] = np.searchsorted(sorted_ens, observations[i])
            
        hist, _ = np.histogram(ranks, bins=n_bins, range=(0, n_members + 1))
        return hist
    
    @staticmethod
    def crps(ensemble_forecasts: np.ndarray, observation: np.ndarray) -> float:
        """
        Continuous Ranked Probability Score for ensemble verification.
        Uses empirical formulation for ensemble CRPS.
        """
        if ensemble_forecasts.ndim == 1:
            ensemble_forecasts = ensemble_forecasts.reshape(1, -1)
            observation = observation.reshape(1)
            
        n_samples, n_members = ensemble_forecasts.shape
        sorted_ens = np.sort(ensemble_forecasts, axis=1)
        
        crps_vals = np.zeros(n_samples)
        for i in range(n_samples):
            ens = sorted_ens[i]
            obs = observation[i]
            
            mae = np.mean(np.abs(ens - obs))
            
            # Efficiently compute mean absolute pairwise difference
            # sum_j sum_k |x_j - x_k|
            # Can be computed in O(N log N) using sorted array
            diff_sum = 0.0
            for j in range(n_members):
                # Using coefficient (2j - n + 1) for sorted array
                diff_sum += (2 * j - n_members + 1) * ens[j]
                
            pairwise_diff = diff_sum / (n_members * n_members)
            crps_vals[i] = mae - pairwise_diff
            
        return float(np.mean(crps_vals))
    
    @staticmethod
    def lead_time_skill_decay(model_scores_by_leadtime: list[float], baseline_scores_by_leadtime: list[float], lead_time_mins: Optional[list[int]] = None, threshold: float = 0.3) -> dict[str, int | float | str]:
        """
        Computes the lead time at which model skill drops below baseline.
        This is THE key metric for proving DL value: 'ConvectNet maintains
        CSI > 0.3 out to T+120min while optical flow drops below 0.3 at T+60min.'
        """
        if lead_time_mins is None:
            # Assume 5 minute increments if not provided
            lead_time_mins = [(i + 1) * 5 for i in range(len(model_scores_by_leadtime))]
            
        def get_drop_lead_time(scores, lead_times, thres):
            for score, lt in zip(scores, lead_times):
                if score < thres:
                    return lt
            return lead_times[-1] if lead_times else 0
            
        model_drop = get_drop_lead_time(model_scores_by_leadtime, lead_time_mins, threshold)
        baseline_drop = get_drop_lead_time(baseline_scores_by_leadtime, lead_time_mins, threshold)
        
        crossover = lead_time_mins[0] if lead_time_mins else 0
        for lt, m_score, b_score in zip(lead_time_mins, model_scores_by_leadtime, baseline_scores_by_leadtime):
            if m_score > b_score:
                crossover = lt
            else:
                break
                
        return {
            'model_maintains_skill_until': model_drop,
            'baseline_maintains_skill_until': baseline_drop,
            'model_superior_until': crossover,
            'summary': f"ConvectNet maintains skill > {threshold} out to T+{model_drop}min while optical flow drops below {threshold} at T+{baseline_drop}min."
        }
